const BodyParser = require("body-parser");
const _ = require('lodash');
const Promise = require("bluebird");
const cors = require('cors')
const rpc = require('request-promise-cache').use( require('bluebird').Promise )

let BADOO_COLLECTION, USER_COLLECTION;

/**
 * function, generates unique cacheKey fro request using `request.query` attributes
 */
const requestToCacheKey = (request) =>  Object.keys(request.query).sort().map(k => `${k}=${request.query[k]}`).join('&');

class Account {
  constructor(app, database) {
    BADOO_COLLECTION = Promise.promisifyAll(database.collection("badoo"));
    USER_COLLECTION = Promise.promisifyAll(database.collection("users"));

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

    // setting up routes
    app.get('/breachedaccount', this.getBreachedAccount);
  }

  getBreachedAccount(request, response){
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
  }

}

module.exports = Account;
