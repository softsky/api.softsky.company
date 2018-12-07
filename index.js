const http = require('http');
const https = require('https');
const fs = require('fs');
const Express = require("express");
const BodyParser = require("body-parser");
const Promise = require("bluebird");
const MongoClient = require("mongodb").MongoClient;
const rpc = require('request-promise-cache').use( require('bluebird').Promise )
const _ = require('lodash');

require('dotenv-flow').config();

const DATABASE_NAME = "hacked";

var BADOO_COLLECTION, USER_COLLECTION;
const HTTP_PORT = process.env.HTTP_PORT
const HTTPS_PORT = process.env.HTTPS_PORT;

var options = {
    key: fs.readFileSync( './certs/api.softsky.company.key' ),
    cert: fs.readFileSync( './certs/api.softsky.company.cert' ),
    requestCert: false,
    rejectUnauthorized: false
};

const cors = require('cors')
var app = Express();

// after the code that uses bodyParser and other cool stuff
var originsWhitelist = [
  'http://localhost:4200',      //this is my front-end url for development
  'http://softsky.company'
];
var corsOptions = {
  origin: function(origin, callback){
        var isWhitelisted = originsWhitelist.indexOf(origin) !== -1;
        callback(null, isWhitelisted);
  },
  credentials:true
}

//here is the magic
app.use(cors(corsOptions));

app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

var database;
/**
 * function, generates unique cacheKey fro request using `request.query` attributes
 */
const requestToCacheKey = (request) =>  Object.keys(request.query).sort().map(k => `${k}=${request.query[k]}`).join('&');

app.get('/breachedaccount', (request, response) => {
  const email = request.query.email;
  const cacheKey = requestToCacheKey(request);

  Promise.all([
    USER_COLLECTION
      .findOne({email:email})
      .then(userRecord =>
            userRecord?Promise.resolve(userRecord):rpc({
              url:`https://haveibeenpwned.com/api/v2/breachedaccount/${email}?truncateResponse=true`,
              cacheKey: cacheKey,
              cacheTTL: 3600,
              headers: {
                "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36"
              },
              json: true
            })
            .then((hibpArray) => {
              return {
                email: email,
                breaches: hibpArray
              }
            })
            .catch(err => err.statusCode === 404?[]:new Error(err))),
    BADOO_COLLECTION
      .findOne({email:email})
      .catch(err => response.status(500).send(err))
  ])
  // once all execeuted
    .then((values) => {
//      console.log('Values0', values[0]);
      console.log('Values1', values[1]);
      const userObject = values[0];
      var Badoo = userObject.breaches.filter(it => it.Name === 'Badoo');
      // if Badoo does not exist on database but returned by Badoo collection,
      // updating
      if(Badoo.length === 0 && values[1]){
        userObject.breaches.push({Name:"Badoo"});
      };
      console.log(userObject);
      return userObject;
    })
  // updating user record
    .then((userObject) =>
          USER_COLLECTION
          .updateOne(userObject,
                     {$set: {breaches:userObject.breaches}},
                     {upsert:true})
          .catch(err => response.status(500).send(err))
          .then(commandResult => Promise.resolve(userObject.breaches)))
    .then((hibpArray) => response.status(200).send(hibpArray))
});

app.put("/user", async (request, response) => {
  console.log(request.body);
  const email = request.body.email;
  if(email === undefined)
    throw new Error('Email should be provided');
  USER_COLLECTION.insertOne({email:email, breaches:[]})
    .catch(console.error.bind(console))
    .then(resp => response.send(resp))
    .catch(err => response.status(404).send(err));
});

app.post("/user", (request, response) => {
  console.log(request.body);
  const email = request.body.email;
  if(!email)
    throw new Error('Email should be provided');
  USER_COLLECTION.updateOne({email: email}, {$set: request.body}, (err, result) => {
    if (err) throw err;
    console.log('updated');
    return response.send(result);
  })
});



module.exports = new Promise((resolve, reject) => {
  console.log(process.env.NODE_ENV);
  console.log(process.env.CONNECTION_URL);
  MongoClient.connect(process.env.CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {
    if(error) {
      reject(error);
    }

    database = client.db(DATABASE_NAME);
    console.log("Connected to mongo database `" + DATABASE_NAME + "`");
    BADOO_COLLECTION = Promise.promisifyAll(database.collection("badoo"));
    USER_COLLECTION = Promise.promisifyAll(database.collection("users"));
    // ONCE Mongo connected we can run server

    http.createServer(app).listen(HTTP_PORT, (it) => console.log(`Server on ${HTTP_PORT} started`));
    https.createServer(app).listen(HTTPS_PORT, (it) => console.log(`Server on ${HTTPS_PORT} started`));
    resolve(app);
  });
}); // for testing
