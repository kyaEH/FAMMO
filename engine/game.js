//this is the main game engine, which will include the movement sync

const {client, testDb} = require('./db');

//get the actual location and map of a character
async function getLocation(username, callback) {
    // connect to the database
    await client.connect();
    // select the database
    const db = client.db('FAMMO');
    // select the collection
    const collection = db.collection('character');
    // check if the user exists
    const character = await collection.findOne({ linkeduser: username });
    // if the character exists
    if (character) {
        // get the location and the coords
        callback([character.location, character.coords]);
        
    } else {
        // return true
        callback(false);
    }
}

//move the character
async function moveCharacter(username, position, callback) {
    // connect to the database
    await client.connect();
    // select the database
    const db = client.db('FAMMO');
    // select the collection
    const collection = db.collection('character');
    // check if the user exists
    const character = await collection.findOne({ linkeduser: username });
    // if the character exists
    if (character) {
        // update the location and the coords
        await collection.updateOne({ linkeduser: username, location: position[0], coords: position[1] });
        
    } else {
        // return true
        callback(false);
    }
}

async function getTriggers(location, callback) {
    // connect to the database
    await client.connect();
    // select the database
    const db = client.db('FAMMO');
    // select the collection
    const collection = db.collection('triggers');
    // check if the user exists
    const triggers = await collection.find({ triggerlocation: location }).toArray();
    // if the character exists
    if (triggers) {
        // get the location and the coords
        callback(triggers);
        
    } else {
        // return true
        callback(false);
    }
}
async function getTriggerFromId(triggerid, callback) {
    // connect to the database
    await client.connect();
    // select the database
    const db = client.db('FAMMO');
    // select the collection
    const collection = db.collection('triggers');
    // check if the user exists
    const trigger = await collection.findOne({ triggerid: triggerid });
    // if the character exists
    if (trigger) {
        // get the location and the coords
        callback(trigger);
        
    } else {
        // return true
        callback(false);
    }
}
async function getActions(triggerid, callback) {
    // connect to the database
    await client.connect();
    // select the database
    const db = client.db('FAMMO');
    // select the collection
    const collection = db.collection('actions');
    // check if the user exists
    const actions = await collection.find({ actionid: triggerid }).toArray();
    // if the character exists
    if (actions) {
        // get the location and the coords
        callback(actions);
        
    } else {
        // return true
        callback(false);
    }
}
async function getMap(mapId, callback) {
    // connect to the database
    await client.connect();
    // select the database
    const db = client.db('FAMMO');

    const collection = db.collection('maps');

    const map = await collection.findOne({ mapid: mapId });
    if (map) {
        // get the location and the coords
        callback(map);
        
    } else {
        // return true
        callback(false);
    }
}
module.exports = { getLocation, moveCharacter, getTriggers, getTriggerFromId, getActions, getMap };