//this is the datasheet, handling the link between a user and his characters
// import the mongoose module


const {client} = require('./db');

function run(from) {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      client.connect();
      // Send a ping to confirm a successful connection
      client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB from " + from);
    } finally {
      // Ensures that the client will close when you finish/error
      client.close();
    }
  }
  run("Datasheet");
//get all the characters from a user
async function getCharacters(username, callback) {
    // connect to the database
    await client.connect();
    // select the database
    const db = client.db('FAMMO');
    // select the collection
    const collection = db.collection('character');
    // check if the user exists
    const characters = await collection.find({ linkeduser: username }).toArray();
    // if the character exists
    if (characters) {
        // return false
        callback(characters);
    } else {
        // return true
        callback(false);
    }
}
async function createCharacter(charactername, username, stats, characterclass, characterimg, callback) {
    // connect to the database
    await client.connect();
    // select the database
    const db = client.db('FAMMO');
    // select the collection
    const collection = db.collection('character');
   
    const char = await collection.findOne({ charactername: charactername });
    
    if (char) {
        callback([false, "Character "+charactername+" already exists"]);
    } else {
        //check if class exists
        const classes = await db.collection('classes').findOne({ classname: characterclass });
        if (!classes) {
            callback([false, "Class does not exist"]);
            return;
        }
        //check if user have more than 4 characters
        const characters = await collection.find({ linkeduser: username }).toArray();
        if (characters.length >= 4) {
            callback([false, "You have too many characters"]);
            return;
        }
        //if the character name is not between 3 and 15 characters
        if (charactername.length < 3 || charactername.length > 15) {
            callback([false, "Character name must be between 3 and 15 characters"]);
            return;
        }
        //if the total stats is not 10
        var total = 0;
        for (var key in stats) {
            total += stats[key];
        }
        if (total != 10) {
            callback([false, "Total stats must be 10"]);
            return;
        }

        await collection.insertOne({ charactername: charactername, linkeduser: username, stats: stats, class: characterclass, img: characterimg, level: 0 });
        callback([true, "Character "+charactername+" created"]);
        
    }
}



async function getAllClasses() {
    // connect to the database
    await client.connect();
    // select the database
    const db = client.db('FAMMO');
    // select the collection
    const collection = db.collection('classes');
    // check if the user exists
    const classes = await collection.find({}).toArray();
    // if the character exists
    
    if (classes) {
        // return false
        return classes;
    } else {
        // return true
        return false;
    }
}

async function deleteCharacter(charactername, username, callback) {
    // connect to the database
    await client.connect();
    // select the database
    const db = client.db('FAMMO');
    // select the collection
    const collection = db.collection('character');
    // check if the user exists
    const character = await collection.findOne({ charactername: charactername, linkeduser: username });
    // if the character exists
    if (character) {
        // delete the character
        
        await collection.deleteOne({ charactername: charactername, linkeduser: username });
        // return true
        callback(true);
    } else {
        // return false
        callback(false);
    }
}

module.exports = { createCharacter, getCharacters, getAllClasses, deleteCharacter };