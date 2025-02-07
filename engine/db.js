//this file is the database connection file, which will be used to connect to the MongoDB database.

// import the mongoose module
const { MongoClient, ServerApiVersion } = require('mongodb');
//encryption 
const crypto = require('crypto');
require('dotenv').config();
// set the connection string
const uri = process.env.FAMMO_MONGO_URI;
const salt = process.env.FAMMO_SALT;
// connect to the database
const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
});

function hashPassword(password, salt, callback) {
    // Higher iterations mean better security but slower process
    const iterations = 10000;
    const hashBytes = 64;
    const digest = 'sha512';

    crypto.pbkdf2(password, salt, iterations, hashBytes, digest, (err, derivedKey) => {
        if (err) throw err;
        callback(derivedKey.toString('hex')); // Save this hash in the DB
    });
}


// // create a function to register a user
async function register(username, password, callback) {
    // connect to the database
    await client.connect();
    // select the database
    const db = client.db('FAMMO');
    // select the collection
    const collection = db.collection('users');
    // check if the user exists
    const user = await collection.findOne({ username: username });
    // if the user exists
    if (user) {
        // return false
        callback(false);
    } else {
        // insert the user
        //encrypt password
        
        hashPassword(password, salt, async (hashedPassword) => {
            await collection.insertOne({ username: username, password: hashedPassword });
        // return true
            callback(true);
            // Store salt and hash in the database
        });

        
        
    }
}

// // create a function to login a user
async function login(username, password, callback) {
    // connect to the database
    await client.connect();
    // select the database
    const db = client.db('FAMMO');
    // select the collection
    const collection = db.collection('users');
    // check if the user exists
    //encrypt password and check if it matches
    hashPassword(password, salt, async (hashedPassword) => {
        const user = await collection.findOne({ username: username, password: hashedPassword });
        
    // if the user exists
    if (user) {
        // return true
        callback(true);
    } else {
        // return false
        callback(false);
    }});
}
  // export the connection
module.exports = { client, register, login};

