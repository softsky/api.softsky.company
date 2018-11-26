const Express = require("express");
const BodyParser = require("body-parser");
const MongoClient = require("mongodb").MongoClient;
const ObjectId = require("mongodb").ObjectID;
const Promise = require("bluebird");
const env = require('dotenv').config();

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

app.put("/user", (request, response) => {
  console.log(request.body);
  USER_COLLECTION.insertOne(request.body, (err, result) => {
    if (err) throw err;
    console.log('inserted');
  })
});
app.post("/user", (request, response) => {
  console.log(request.body);
  const email = request.body.email;
  if(!email)
    throw new Exception('Email should be provided');
    USER_COLLECTION.updateOne({email: email}, {$set: request.body}, (err, result) => {
    if (err) throw err;
    console.log('updated');
    return response.send(result);
  })
});

app.listen(3000, () => {
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
