const Express = require('express');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const expect = chai.expect;
const MongoClient = require("mongodb").MongoClient;
const Account = require('./account.js')

var config = require('dotenv-flow').config();

const user = process.env.MONGO_USER;
const password = process.env.MONGO_PASSWORD;
const mongoUrl = eval("`" + (process.env || wt.webtaskContext.secrets).CONNECTION_URL + "`");
const app = Express();

let mongoClient;


describe('API', () => {
  beforeAll((done) => {
    MongoClient.connect(mongoUrl, { useNewUrlParser: true }, (error, client) => {
      if(error) {
        console.error(error);
        done(error);
      }
      mongoClient = client;
      new Account(app, client.db('test'));
      done();
    });
  })


  afterAll((done) => {
    mongoClient.disconnect();
    done();
  })

  test('GET /breachedaccount existing FRESH user', () => {
    return chai.request(app)
      .get('/breachedaccount')
      .query({email:'gutsal.arsen@gmail.com'})
      .then((res) => {
        console.log(res.body);
        expect(res).to.have.status(200);
        expect(res.body).to.be.a('array');
      })
  })
});
