const http = require('http');
const https = require('https');
const Express = require("express");
const MongoClient = require("mongodb").MongoClient;
const Account = require('./src/account');
const User = require('./src/user');
const Payment = require('./src/payment');

var wt = require('webtask-tools');

const DATABASE_NAME = "hacked";

// if environment is not set, considering production
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
var config = require('dotenv-flow').config();

const HTTP_PORT = process.env.HTTP_PORT;
const HTTPS_PORT = process.env.HTTPS_PORT;

var app = Express();

var database;

// console.log('wt', wt);
// console.log('wt.webtaskContext', wt.webtaskContext);
// console.log('wt.context', wt.context);

const user = process.env.MONGO_USER;
const password = process.env.MONGO_PASSWORD;
const mongoUrl = eval("`" + (process.env || wt.webtaskContext.secrets).CONNECTION_URL + "`");
// console.log((process.env || wt.webtaskContext.secrets).CONNECTION_URL);
// console.log(mongoUrl);
MongoClient.connect(mongoUrl, { useNewUrlParser: true }, (error, client) => {
  if(error) {
    throw new Error(error);
  }

  database = client.db(DATABASE_NAME);
  console.log("Connected to mongo database `" + DATABASE_NAME + "`");
  // ONCE Mongo connected we can run server

  new Account(app, database);
  new User(app, database);
  new Payment(app, database);

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
