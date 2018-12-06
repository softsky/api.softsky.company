const http = require('http');
const https = require('https');
const fs = require('fs');
const Express = require("express");
const BodyParser = require("body-parser");
const Promise = require("bluebird");
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectID;
const rpc = require('request-promise-cache').use( require('bluebird').Promise )
const env = require('dotenv').config();
const _ = require('lodash');

const DATABASE_NAME = "hacked";

var BADOO_COLLECTION, USER_COLLECTION;
const HTTP_PORT = env.parsed.HTTP_PORT
const HTTPS_PORT = env.parsed.HTTPS_PORT;

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
  'http://api.softsky.company'
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
  console.log(`Cache key: ${cacheKey}`);

  Promise.all([
    USER_COLLECTION
      .findOneAsync({email:email})
      .then(result =>
            result?Promise.resolve(result.breaches):rpc(
              {
                url:`https://haveibeenpwned.com/api/v2/breachedaccount/${email}?truncateResponse=false`,
                cacheKey: cacheKey,
                cacheTTL: 3600,
                headers: {
                  "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36"
                },
                json: true
              })
            .then((p) => {
              USER_COLLECTION.insertOne({email: email, breaches:p});
              return p;
            })
           )
      .catch(err => err.statusCode === 404?[]:new Error(err)),
    BADOO_COLLECTION
      .findOneAsync({email:email})
      .then(result => Promise.resolve(result))
      .catch(err => response.status(404).send(err))
  ])
  // once all execeuted
    .then(async (values) =>{
      console.log('Values', values);

      var Badoo = values[0].filter(it => it.Name === 'Badoo');
      if((Badoo.length === 0) && values[1]){
        Badoo = {
          "Name": "Badoo",
          "Title": "Badoo",
          "Domain": "badoo.com",
          "BreachDate": "2013-06-01",
          "AddedDate": "2016-07-06T08:16:03Z",
          "ModifiedDate": "2016-07-06T08:16:03Z",
          "PwnCount": {
            "$numberInt": "112005531"
          },
          "Description": "In June 2016, <a href=\"http://motherboard.vice.com/read/another-day-another-hack-user-accounts-of-dating-site-badoo\" target=\"_blank\" rel=\"noopener\">a data breach allegedly originating from the social website Badoo was found to be circulating amongst traders</a>. Likely obtained several years earlier, the data contained 112 million unique email addresses with personal data including names, birthdates and passwords stored as MD5 hashes. Whilst there are many indicators suggesting Badoo did indeed suffer a data breach, <a href=\"https://www.troyhunt.com/introducing-unverified-breaches-to-have-i-been-pwned\" target=\"_blank\" rel=\"noopener\">the legitimacy of the data could not be emphatically proven</a> so this breach has been categorised as &quot;unverified&quot;.",
          "LogoType": "svg",
          "DataClasses": [
            "Dates of birth",
            "Email addresses",
            "Genders",
            "Names",
            "Passwords",
            "Usernames"
          ],
          "IsVerified": false,
          "IsFabricated": false,
          "IsSensitive": true,
          "IsRetired": false,
          "IsSpamList": false,
          "Data": values[1]
        };
        console.log(Badoo);
        values[0].push(Badoo);
      }
      response.status(200).send(values[0]);
    });
});

app.get("/breaches", (request, response) => {
  const email = request.query.email;
  console.log(request.query);
  USER_COLLECTION.findOneAsync({email:email})
    .then(result => {
    })
});

app.put("/user", async (request, response) => {
  console.log(request.body);
  const email = request.body.email;
  if(email === undefined)
    throw new Error('Email should be provided');


      USER_COLLECTION.insertOneAsync(data)
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

MongoClient.connect(env.parsed.CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {
  if(error) {
    throw error;
  }
  database = client.db(DATABASE_NAME);
  console.log("Connected to `" + env.parsed.CONNECTION_URL + "/" + DATABASE_NAME + "`!");
  BADOO_COLLECTION = Promise.promisifyAll(database.collection("badoo"));
  USER_COLLECTION = Promise.promisifyAll(database.collection("users"));
  // ONCE Mongo connected we can run server

  http.createServer(app).listen(HTTP_PORT, (it) => console.log(`Server on ${HTTP_PORT} started`));
  https.createServer(app).listen(HTTPS_PORT, (it) => console.log(`Server on ${HTTPS_PORT} started`));

});
