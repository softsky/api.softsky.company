const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);

const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const expect = chai.expect;

const serverPromise = require('./index.js')
let server;

describe('API', () => {
  beforeAll(() => {
    return serverPromise.then((s) => server = s); // waiting for server to complete initialization
  });


  afterAll(() => {
    server.close();
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

})
