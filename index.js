const http = require('http');
const https = require('https');
const Express = require("express");
const BodyParser = require("body-parser");
const Promise = require("bluebird");
const MongoClient = require("mongodb").MongoClient;
const rpc = require('request-promise-cache').use( require('bluebird').Promise )
const _ = require('lodash');
const LiqPay = require('sdk-NodeJS/lib/liqpay');

var wt = require('webtask-tools');

const DATABASE_NAME = "hacked";

var BADOO_COLLECTION, USER_COLLECTION, PAYMENT_COLLECTION;

// if environment is not set, considering production
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
var config = require('dotenv-flow').config();

const HTTP_PORT = process.env.HTTP_PORT;
const HTTPS_PORT = process.env.HTTPS_PORT;
const LIQPAY_KEY = process.env.LIQPAY_KEY;
const LIQPAY_PKEY = process.env.LIQPAY_PKEY;

const liqpay = new LiqPay(LIQPAY_KEY, LIQPAY_PKEY)

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

app.post("/paymentReceived", (request, response) => {
  const sha1 = require('sha1');
  console.log(request.body);

  const signature = Buffer.from(sha1( LIQPAY_PKEY + request.body.data + LIQPAY_PKEY) ).toString('base64');

  console.log(Buffer.from(request.body.data,'base64').toString());
  if(signature === request.body.signature){
    console.log('Signature match', Buffer.from(request.body.data,'base64').toString());
    PAYMENT_COLLECTION.
      insertOne(request.body.data)
      .catch(err => response.status(500).send(err))
      .then(data => response.status(200).send(data))
  } else {
    console.log('Signature does not match', signature, request.body.signature);
    response.status(500).send('Signatures donesn\'t match');
  }
});

// console.log('wt', wt);
// console.log('wt.webtaskContext', wt.webtaskContext);
// console.log('wt.context', wt.context);

const user = process.env.MONGO_USER;
const password = process.env.MONGO_PASSWORD;
const mongoUrl = eval("`" + (process.env || wt.webtaskContext.secrets).CONNECTION_URL + "`");
console.log((process.env || wt.webtaskContext.secrets).CONNECTION_URL);
console.log(mongoUrl);
MongoClient.connect(mongoUrl, { useNewUrlParser: true }, (error, client) => {
  if(error) {
    console.error(error);
  }

  database = client.db(DATABASE_NAME);
  console.log("Connected to mongo database `" + DATABASE_NAME + "`");
  BADOO_COLLECTION = Promise.promisifyAll(database.collection("badoo"));
  USER_COLLECTION = Promise.promisifyAll(database.collection("users"));
  PAYMENT_COLLECTION = Promise.promisifyAll(database.collection("payments"));
  // ONCE Mongo connected we can run server

  if(HTTP_PORT)
    http.createServer(app).listen(HTTP_PORT, (it) => console.log(`Server on ${HTTP_PORT} started`));
  if(HTTPS_PORT)
    https.createServer(app).listen(HTTPS_PORT, (it) => console.log(`Server on ${HTTPS_PORT} started`));
});

if(HTTP_PORT || HTTPS_PORT){
  module.exports = app;
} else {
  modue.exports = wt.fromExpress(app);
}
