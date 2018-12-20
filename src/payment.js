const _ = require('lodash');
const Promise = require("bluebird");

const BodyParser = require("body-parser");
const cors = require('cors')
const rpc = require('request-promise-cache').use( require('bluebird').Promise )

process.env.NODE_ENV = process.env.NODE_ENV || 'production';
var config = require('dotenv-flow').config();

const LIQPAY_KEY = process.env.LIQPAY_KEY;
const LIQPAY_PKEY = process.env.LIQPAY_PKEY;

// const LiqPay = require('sdk-NodeJS/lib/liqpay');
// const liqpay = new LiqPay(LIQPAY_KEY, LIQPAY_PKEY)

let PAYMENT_COLLECTION;

class Payment {
  constructor(app, database) {
    PAYMENT_COLLECTION = Promise.promisifyAll(database.collection("payments"));

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

    app.post("/paymentReceived", this.postPaymentReceived);
  }

  postPaymentReceived(request, response){
    const sha1 = require('sha1');
    const data = JSON.parse(Buffer.from(request.body.data, 'base64').toString());
    //let signature = Buffer.from(sha1(LIQPAY_PKEY + request.body.data + LIQPAY_PKEY)).toString('base64');
    var crypto = require('crypto')
    , shasum = crypto.createHash('sha1');
    shasum.update(LIQPAY_PKEY + request.body.data + LIQPAY_PKEY);
    const signature = Buffer.from(shasum.digest('bin')).toString('base64');

    if(signature === request.body.signature){
      console.log('Signature match', data);
      PAYMENT_COLLECTION.
        insertOne(data)
        .then(data => response.status(200).send(data))
        .catch(err => response.status(501).send(err))
    } else {
      console.log('Signature does not match', signature, request.body.signature);
      response.status(502).send('Signatures donesn\'t match');
    }
  };
}

module.exports = Payment;
