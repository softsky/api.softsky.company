const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const expect = chai.expect;

const server = require('./index.js')

describe('API', () => {
  beforeAll(() => {
    return new Promise((resolve,reject) => setTimeout(resolve, 2000)) // waiting for server to initialize
  });


  afterAll(() => {
    return server.close();
  })

  test('GET /breachedaccount existing FRESH user', () => {
    return chai.request(server)
      .get('/breachedaccount')
      .query({email:'gutsal.arsen@gmail.com'})
      .then((res) => {
        console.log(res.body);
        expect(res).to.have.status(200);
        expect(res.body).to.be.a('array');
      })
  });

  test('POST /paymentReceived with shitty data', () => {
    return chai.request(server)
      .post('/paymentReceived')
      .send({
        data: 'some data',
        signature: 'some-signature'
      })
      .then((res) => {
        expect(res).to.have.status(500);
      })
  });

  test('POST /paymentReceived with well-crafted data', (done) => {
    var LiqPay = require('liqpay');
    var config = require('dotenv-flow').config();

    var liqpay = new LiqPay(process.env.LIQPAY_KEY, process.env.LIQPAY_PKEY);
    liqpay.api("request", {
      "action"                : "subscribe",
      "version"               : "3",
      "phone"                 : "380950000001",
      "amount"                : "1",
      "currency"              : "USD",
      "description"           : "description text",
      "order_id"              : "order_id_1",
      "subscribe"             : "1",
      "subscribe_date_start"  : new Date(),
      "subscribe_periodicity" : "month",
      "card"                  : "4731195301524634",
      "card_exp_month"        : "03",
      "card_exp_year"         : "22",
      "card_cvv"              : "111"
    }, function( json ){
      console.log( json.status );
      done();
    });

  });


})
