const Express = require("express");
const BodyParser = require("body-parser");
const Promise = require("bluebird");
const MongoClient = Promise.promisifyAll(require("mongodb").MongoClient);
const ObjectId = require("mongodb").ObjectID;
const rp = require('request-promise');
const env = require('dotenv').config();
const _ = require('lodash');

const DATABASE_NAME = "hacked";

var BADOO_COLLECTION, USER_COLLECTION;
var app = Express();

app.use(BodyParser.json());
app.use(BodyParser.urlencoded({ extended: true }));

var database;

app.get("/breaches", (request, response) => {
  console.log(request.query);
  BADOO_COLLECTION.findAsync(request.query)
    .then((result) => {
      result.toArray((err, res) => {
        return response.send(res);
      })
    })
    .catch(err => {
      if (err) throw err;
    });
});

app.put("/user", async (request, response) => {
  console.log(request.body);
  const email = request.body.email;
  if(email === undefined)
    throw new Error('Email should be provided');

  Promise.all([
    rp.get({
      uri:`https://haveibeenpwned.com/api/breachedaccount/${request.body.email}`,
      headers: {
        "User-Agent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36"
      },
      json: true
    }),
    BADOO_COLLECTION
      .findOneAsync({email:email})
      .catch(err => response.status(404).send(err))
      .then(result => new Promise(resolve => {
        console.log('DATA:', result);
        resolve(result);
      }))
  ])
  // once all execeuted
    .then(values => {
      console.log('Values', values);
      const data = _.merge(request.body, values.length === 2?values[1][0]:{});
      values[0].foreach(it => {})

      USER_COLLECTION.insertOneAsync(data)
        .catch(console.error.bind(console))
        .then(resp => response.send(resp))
    });
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

app.listen(3000, () => {
  console.log('Connecting to:', process.env.CONNECTION_URL);
  MongoClient.connect(process.env.CONNECTION_URL, { useNewUrlParser: true }, (error, client) => {
    if(error) {
      throw error;
    }
    database = client.db(DATABASE_NAME);
    console.log("Connected to `" + DATABASE_NAME + "`!");
    BADOO_COLLECTION = Promise.promisifyAll(database.collection("badoo_ua"));
    USER_COLLECTION = Promise.promisifyAll(database.collection("users"));
  });
});
