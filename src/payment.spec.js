const Express = require('express');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const expect = chai.expect;
const MongoClient = require("mongodb").MongoClient;
const Payment = require('./payment.js')

var config = require('dotenv-flow').config();

const user = process.env.MONGO_USER;
const password = process.env.MONGO_PASSWORD;
const mongoUrl = eval("`" + (process.env || wt.webtaskContext.secrets).CONNECTION_URL + "`");
const app = Express();

describe('API', () => {
  beforeAll((done) => {
    MongoClient.connect(mongoUrl, { useNewUrlParser: true }, (error, client) => {
      if(error) {
        console.error(error);
        done(error);
      }
      new Payment(app, client.db('test'));
      done();
    });
  });

  afterAll((done) => {
    done();
  })

  test('POST /paymentReceived with shitty data', () => {
    return chai.request(app)
      .post('/paymentReceived')
      .send({
        data: 'some data',
        signature: 'some-signature'
      })
      .then((res) => {
        expect(res).to.have.status(500);
      })
  });

  test('POST /paymentReceived with well-crafted data', () => {
    const LIQPAY_DATA = {
      signature: '6KC6bQKo6rf69odYYP625KsDNmE=',
      data:
      'eyJhY3Rpb24iOiJwYXkiLCJwYXltZW50X2lkIjo4ODkwODg4MzcsInN0YXR1cyI6ImZhaWx1cmUiLCJlcnJfY29kZSI6Ijk4NTkiLCJlcnJfZGVzY3JpcHRpb24iOiJJbnN1ZmZpY2llbnQgZnVuZHMiLCJ2ZXJzaW9uIjozLCJ0eXBlIjoiZG9uYXRlIiwicGF5dHlwZSI6ImNhcmQiLCJwdWJsaWNfa2V5IjoiaTEyNjY3MzUxMDM4IiwiYWNxX2lkIjo0MTQ5NjMsIm9yZGVyX2lkIjoiVDkyR1RZR0QxNTQ0MTg5ODk5ODkyNTMyIiwibGlxcGF5X29yZGVyX2lkIjoiOU03MllQNEExNTQ0MTkwMjMwMDMzNTk5IiwiZGVzY3JpcHRpb24iOiJMaXFQYXkgcGF5bWVudCIsInNlbmRlcl9waG9uZSI6IjM4MDk2NTk5NjMyOCIsInNlbmRlcl9maXJzdF9uYW1lIjoi0JDRgNGB0LXQvSIsInNlbmRlcl9sYXN0X25hbWUiOiLQk9GD0YbQsNC7Iiwic2VuZGVyX2NhcmRfbWFzazIiOiI1MTY4NzQqODgiLCJzZW5kZXJfY2FyZF9iYW5rIjoicGIiLCJzZW5kZXJfY2FyZF90eXBlIjoibWMiLCJzZW5kZXJfY2FyZF9jb3VudHJ5Ijo4MDQsImlwIjoiNS41OC4yMzUuMjIxIiwiYW1vdW50IjoxLjAsImN1cnJlbmN5IjoiVUFIIiwic2VuZGVyX2NvbW1pc3Npb24iOjAuMCwicmVjZWl2ZXJfY29tbWlzc2lvbiI6MC4wMywiYWdlbnRfY29tbWlzc2lvbiI6MC4wLCJhbW91bnRfZGViaXQiOjEuMCwiYW1vdW50X2NyZWRpdCI6MS4wLCJjb21taXNzaW9uX2RlYml0IjowLjAsImNvbW1pc3Npb25fY3JlZGl0IjowLjAzLCJjdXJyZW5jeV9kZWJpdCI6IlVBSCIsImN1cnJlbmN5X2NyZWRpdCI6IlVBSCIsInNlbmRlcl9ib251cyI6MC4wLCJhbW91bnRfYm9udXMiOjAuMCwibXBpX2VjaSI6IjciLCJpc18zZHMiOmZhbHNlLCJjcmVhdGVfZGF0ZSI6MTU0NDE5MDIwNDg3NiwiZW5kX2RhdGUiOjE1NDQxOTM4MzM5NzEsInRyYW5zYWN0aW9uX2lkIjo4ODkwODg4MzcsImNvZGUiOiI5ODU5In0='
    };

    return chai.request(app)
      .post('/paymentReceived')
      .type('json')
      .send(LIQPAY_DATA)
      .then((res) => {
        expect(res).to.have.status(200);
      })

  })
});
