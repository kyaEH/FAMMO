//let's make a web browser MMO, which is a pixel RPG game, but with turn based combat.
// This is the server side of the game, which will include the server logic, and will include multiples files such as the game logic, the database logic, the combat system, the party system and the server logic.
// The server will be using Node.js, Express.js, and Socket.io.
// The server will be using a MongoDB database.
// we will have a login and register page, and a game page, using mongoDB with db.js and cookies.

// Importing the required modules
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const path = require('path');
const io = require('socket.io')(http);
const hbs = require('hbs');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const session = require('express-session');
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
var cron = require('node-cron');
const db = require('./engine/db.js');
const combat = require('./engine/combat.js');
const game = require('./engine/game.js');
const party = require('./engine/party.js');
const dsheet = require('./engine/datasheet.js');
const blocklist = require('./engine/blocklist.js');
//handlebar helper
const handlebarhelper = require('./engine/helper.js');
const { set } = require('mongoose');
//dotenv
require('dotenv').config();
//FAMMO_RECAPTCHA_SECRET / SITE
const recaptcha = require('express-recaptcha').RecaptchaV3;
const recaptchaKey = process.env.FAMMO_RECAPTCHA_SECRET;
const recaptchaSite = process.env.FAMMO_RECAPTCHA_SITE;
const request = require('request');
//cron job to download the blocklist every 2 hours
blocklist.downloadBlocklist();
cron.schedule('0 */2 * * *', () => {
    blocklist.downloadBlocklist();
    testDb("Cron job in App.js");
});
var port = process.env.PORT || 42069;
// get -p parameter
const args = process.argv.slice(2);
if (args.length > 0)
    port = args[0];



//read the wordlist which contains banned words for the chat
const wordlist = blocklist.getWordList();

const ipBlocker = require('./middleware/ipBlocker');
const sessionHandler = require('./middleware/sessionHandler');
const indexRouter = require('./routes/index');
const loginRouter = require('./routes/login');
const createCharacterRouter = require('./routes/characters/create');

// Setting the view engine
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// Setting the middleware
app.use(ipBlocker);
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
sessionMiddleware = session({ secret: 'secret', resave: false, saveUninitialized: false })
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

// Setting the routes
app.use('/', indexRouter);
app.use('/', loginRouter);
app.use('/', createCharacterRouter);

app.get('/register', (req, res) => {
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if(blocklist.checkIp(clientip)) return;
    //if user is already logged in, redirect to /game
    if (req.session?.username) {
        res.redirect('/game');
    } else {
        res.render('register');
    }
});

app.post('/register', [
    body('username')
        .trim()
        .escape()  // Escape special characters
        .isLength({ min: 3, max: 20 }).withMessage('Username must be between 3 and 20 characters'),
    body('password')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('captcha').notEmpty().withMessage('Captcha is required')
], (req, res) => {
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if(blocklist.checkIp(clientip)) return;
    // Validate the inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    // reCAPTCHA Verification
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaKey}&response=${req.body.captcha}`;
    
    request(verifyUrl, (err, response, body) => {
        body = JSON.parse(body);
        console.log(body);
        if (body.success !== undefined && !body.success) {
            return res.json({ success: false, message: "Failed captcha verification" });
        }

        // Get sanitized username and password from request
        const username = sanitizeHtml(req.body.username);  // Sanitize username
        //username must contains only letters and numbers
        if (!/^[a-zA-Z0-9]+$/.test(username)) {
            return res.json({ success: false, message: "Username must contain only letters and numbers" });
        }
        const password = req.body.password;  // Password is already hashed in db.register

        // Check if the username already exists
        

            // Register the user (password is already hashed in db.register)
            db.register(username, password, (result) => {
                if (result) {
                    // Set the session username
                    req.session.username = username;
                    // Redirect to /game
                    return res.json({ success: true, message: "User created! Please login" });
                } else {
                    return res.json({ success: false, message: "Couldn't create the user" });
                }
            });
        
    });
});

app.get('/game', sessionHandler, (req, res) => {
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if(blocklist.checkIp(clientip)) return;
    //if user is not logged in, redirect to /login
    if (!req.session?.username) {
        res.redirect('/login');
    } else {
        //get characters from the user
        //if user have a charname in session, delete it
        if (req.session.charname) {
            delete req.session.charname;
        }
        dsheet.getCharacters(req.session.username, (characters) => {
            //if have ch
            res.render('game', { username: req.session.username, characters: characters });
        });
    }
});

app.get('/createcharacter', sessionHandler, (req, res) => {
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if(blocklist.checkIp(clientip)) return;
    //if user is not logged in, redirect to /login
    if (!req.session?.username) {
        res.redirect('/login');
    } else {
        dsheet.getCharacters(req.session.username, (characters) => {
            //render the game page with the characters
            //if the user have more than 4 characters, cancel the creation and render the game page instead
            if (characters.length >= 4) {
                res.render('game', { username: req.session.username, characters: characters });
                return;
            } 
            // if one of the stats is below 0, cancel the creation and render the game page instead
            if (req.body.strength < 0 || req.body.constitution < 0 || req.body.dexterity < 0 || req.body.intelligence < 0 || req.body.focus < 0 || req.body.agility < 0) {
                res.render('game', { username: req.session.username, characters: characters });
                return;
            }
            else {
                res.render('createChars', { username: req.session.username });
            }
        });
        
    }
});

app.post('/logout', (req, res) => {
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if(blocklist.checkIp(clientip)) return;
    //destroy the session
    req.session.destroy();
    //redirect to /login
    res.redirect('/login');
});
// Starting the server


app.post('/getallclasses', sessionHandler, (req, res) => {
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if(blocklist.checkIp(clientip)) return;
    //send all classes to the client
    //check if user is connected
    if (!req.session.username) {
        res.send('You are not connected');
        return;
    }
    dsheet.getAllClasses().then((classes) => {
        res.send(classes);
    });
});
// NEED TO CHECK
app.post('/createChar', (req, res) => {
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if(blocklist.checkIp(clientip)) return;
    //check if user is connected
    if (!req.session.username) {
        res.json({ success: false, message: 'You are not connected' });
        return;
    }
    const charactername = req.body.name;
    const stats = {
        strength: parseInt(req.body.strength),
        constitution: parseInt(req.body.constitution),
        dexterity: parseInt(req.body.dexterity),
        intelligence: parseInt(req.body.intelligence),
        focus: parseInt(req.body.focus),
        agility: parseInt(req.body.agility)
    };
    // for each stat, check if it is above 0
    for (var key in stats) {
        if (stats[key] < 0) {
            res.json({ success: false, message: 'Stats must be above 0' });
            return;
        }
    }
    const characterclass = req.body.class;
    const charImg = req.body.charImg;
    //create the character
    dsheet.createCharacter(charactername, req.session.username, stats, characterclass ,charImg, (result) => {
        //send the result to the client
        console.log("User " + req.session.username + " created character " + charactername + " with stats " + JSON.stringify(stats));
        //if result[0] is true, character is created
        if (result[0]) {
            res.json({ success: true, message: 'Character created successfully' });
        } else {
            //if result[0] is false, character is not created
            res.json({ success: false, message: result[1] });
        }
    });
});

app.post('/deleteCharacter', sessionHandler, (req, res) => {
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if(blocklist.checkIp(clientip)) return;
    //check if user is connected
    if (!req.session.username) {
        res.send('You are not connected');
        return;
    }
    //get the character name from the request
    const charactername = req.body.charactername;
    console.log(req.session.username + " is deleting character " + charactername);
    //delete the character
    dsheet.deleteCharacter(charactername, req.session.username, (result) => {
        //send the result to the client
        res.send(result);
    });
});

app.post('/play', sessionHandler, (req, res) => {
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if(blocklist.checkIp(clientip)) return;
    //check if user is connected
    if (!req.session.username) {
        res.json({ success: false, message: 'You are not connected' });
        return;
    }
    //get the character name from the request
    const charactername = req.body.charactername;
    console.log(req.body);
    //check if the character is owned by the user
    dsheet.getCharacter(req.session.username, charactername, (character) => {
        //if the character is owned by the user, set the session charname and return success
        if (character) {
            req.session.charname = charactername;
            console.log(character);
            res.json({ success: true });
        } else {
            //if the character is not owned by the user, return failure
            res.json({ success: false, message: 'Character not found or not owned by you' });
        }
    });
});

app.get('/play', sessionHandler, (req, res) => {
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if(blocklist.checkIp(clientip)) return;
    //check if user is connected
    if (!req.session.username) {
        res.redirect('/login');
        return;
    }
    //if user is not connected, redirect to /login
    if (!req.session.charname) {
        res.redirect('/game');
        return;
    }
    //get the character name from the session
    const charactername = req.session.charname;
    //get the character from the database
    dsheet.getCharacter(req.session.username, charactername, (character) => {
        //if the character is not found, redirect to /game
        if (!character) {
            res.redirect('/game');
            return;
        }
        //render the play page with the character
        //get the map from the database
        game.getMap(character.location, (map) => {
            //for each map.maptriggerid, getTriggerFromId 
            var triggers = [];
            for (var i = 0; i < map.maptriggerid.length; i++) {
                game.getTriggerFromId(map.maptriggerid[i], (trigger) => {
                    triggers.push(trigger);
                });
            }
            
            setTimeout(() => {
                res.render('gameEngine', {username: req.session.username, character: character, map: map, triggers: triggers});
            }, 3000);
        });
        
        
    });
});

//fallback * 
app.get('*', (req, res) => {
    //check ip and log it
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    //log the url checked
    console.log("Checking URL: " + req.url);
    if(blocklist.addReviewedIp(clientip)) 
        {
            console.log("IP BLOCKED" + clientip);
            return;
        }
    res.status(404).send('404 Not Found');
});
//socket io chat message
io.on('connection', (socket) => {
    const session = socket.request.session;
    if (!session.username) {
        return;
    }
    if(session.charname){
        var username = session.charname;
    }
    else{
        var username = session.username;
    }
    io.emit('chat message', username+' has connected to the chat');
    
    //if user is not connected, return
    
    console.log('a user connected');
    socket.on('chat message', (msg) => {
        //if message is empty or only contains one or multiples spaces, return
        if(msg.length <= 0 || msg.trim().length <= 0) {
            return;
        }
        //if msg too long, return
        if(msg.length > 200) {
            socket.emit('chat message', 'Message is too long');
            return;
        }

        //log user name and message
        console.log(username+ ': ' + msg);
        //check if message contains banned words
        
        if (wordlist.some(word => msg.toLowerCase().includes(word))) {
            //if message contains banned words, send a message to the user
            console.log('User ' + session.username + ' used banned words: '+msg);
            socket.emit('chat message', 'You cannot use banned words');
            return;
        }
        //send to everyone
        io.emit('chat message', username + ': ' + msg);
    });
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    socket.on("newPlayer", (msg) => {
        console.log("new player:" + username);
        //if user is not connected, return
        if (!session.username) {
            return;
        }
        //session charname
        //get the character name from the db
        var location = 1;
        dsheet.getCharacter(session.username, session.charname, (character) => {
            location = character.location;
            socket.broadcast.emit('newPlayer', character);
        });

        //get all character inside of the character map
        
        
    });
    socket.on('playerMovement', (msg) => {
        console.log(msg);
        //if user is not connected, return
        if (!session.username) {
            return;
        }
        //
        //if user is connected, send the message to everyone
        io.emit('playerMovement', msg, username);
    });

    
});

http.listen(port, '0.0.0.0', () => {
    console.log('Server started on port ' + port);
});



