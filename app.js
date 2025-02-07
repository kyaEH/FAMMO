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
});

//read the wordlist which contains banned words for the chat
const wordlist = blocklist.getWordList();


//test the blocklist with ip 1.65.255.225

// Setting the view engine
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views', 'partials'));

// Setting the middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
sessionMiddleware = session({ secret: 'secret', resave: false, saveUninitialized: false })
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);
// Setting the routes
app.get('/', (req, res) => {
    //if user is logged in, redirect to /game, else redirect to /login
    //check requester ip in blocklist
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    console.log("IP on /: " + clientip);
    if(blocklist.checkIp(clientip)) return;
    
    if (req.session?.username) {
        res.redirect('/game');
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    //if user is already logged in, redirect to /game
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if(blocklist.checkIp(clientip)) return;
    if (req.session?.username) {
        res.redirect('/game');
    } else {
        res.render('login');
    }
});

app.post('/login', (req, res) => {
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if(blocklist.checkIp(clientip)) return;
    console.log("LOGIN REQUEST");

    // reCAPTCHA Verification
    var verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaKey}&response=${req.body.captcha}`;
    setTimeout(() => {
    request(verifyUrl, (err, response, body) => {
        body = JSON.parse(body);
        console.log(body);
        if (body.success !== undefined && !body.success) {
            return res.json({ success: false, message: "Failed captcha verification" });
        }

        // Get username & password from request
        const { username, password } = req.body;

        // Check if user exists in DB
        db.login(username, password, (result) => {
            if (result) {
                req.session.username = username;

                // Send JSON response instead of redirecting directly
                return res.json({ success: true, redirectUrl: "/game" });
            } else {
                return res.json({ success: false, message: "Invalid username or password" });
            }
        });
    });
    }, 1000);
});


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

app.get('/game', (req, res) => {
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if(blocklist.checkIp(clientip)) return;
    //if user is not logged in, redirect to /login
    if (!req.session?.username) {
        res.redirect('/login');
    } else {
        //get characters from the user
        dsheet.getCharacters(req.session.username, (characters) => {
            //render the game page with the characters
            res.render('game', { username: req.session.username, characters: characters });
        });
    }
});

app.get('/createcharacter',[
    body('name')
        .trim()
        .escape()  // Escape special characters
        .isLength({ min: 3, max: 15 }).withMessage('Character name must be between 3 and 15 characters'),
    body('strength')
        .isInt({ min: 1, max: 100 }).withMessage('Strength must be between 1 and 100'),
    body('constitution')
        .isInt({ min: 1, max: 100 }).withMessage('Constitution must be between 1 and 100'),
    body('dexterity')
        .isInt({ min: 1, max: 100 }).withMessage('Dexterity must be between 1 and 100'),
    body('intelligence')
        .isInt({ min: 1, max: 100 }).withMessage('Intelligence must be between 1 and 100'),
    body('focus')
        .isInt({ min: 1, max: 100 }).withMessage('Focus must be between 1 and 100'),
    body('agility')
        .isInt({ min: 1, max: 100 }).withMessage('Agility must be between 1 and 100'),
    body('class')
        .isLength({ min: 1 }).withMessage('Class is required')
], (req, res) => {
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


app.post('/getallclasses', (req, res) => {
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
        res.send('You are not connected');
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
            res.redirect('/game?errormsg=Stats must be above 0');
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
            res.redirect('/game');
        } else {
            //if result[0] is false, character is not created
            res.redirect('/game?errormsg=' + result[1]);
        }
    });

});

app.post('/deleteCharacter', (req, res) => {
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

//fallback * 
app.get('*', (req, res) => {
    //check ip and log it
    var clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    //log the url checked
    console.log("Checking URL: " + req.url);
    if(blocklist.addRewiedIp(clientip)) 
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
    io.emit('chat message', session.username+' has connected to the chat');
    
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
        console.log(session.username + ': ' + msg);
        //check if message contains banned words
        
        if (wordlist.some(word => msg.toLowerCase().includes(word))) {
            //if message contains banned words, send a message to the user
            console.log('User ' + session.username + ' used banned words');
            socket.emit('chat message', 'You cannot use banned words');
            return;
        }
        //send to everyone
        io.emit('chat message', session.username + ': ' + msg);
    });
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

http.listen(80, '0.0.0.0', () => {
    console.log('Server started on http://localhost:80');
});



