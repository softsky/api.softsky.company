const _ = require('lodash');
const Promise = require("bluebird");


let USER_COLLECTION;
class User {
  constructor(app, database) {
    USER_COLLECTION = Promise.promisifyAll(database.collection("users"));

    app.put("/user", this.putUser);
    app.post("/user", this.postUser);

  }

  putUser(request, response){
    console.log(request.body);
    const email = request.body.email;
    if(email === undefined)
      throw new Error('Email should be provided');
    USER_COLLECTION.insertOne({email:email, breaches:[]})
      .catch(console.error.bind(console))
      .then(resp => response.send(resp))
      .catch(err => response.status(404).send(err));
  };

  postUser(request, response){
    console.log(request.body);
    const email = request.body.email;
    if(!email)
      throw new Error('Email should be provided');
    USER_COLLECTION.updateOne({email: email}, {$set: request.body}, (err, result) => {
      if (err) throw err;
      console.log('updated');
      return response.send(result);
    })
  };

}

module.exports = User;
