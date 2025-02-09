const express = require('express');
const router = express.Router();
const request = require('request');
const db = require('../engine/db.js');
const recaptchaKey = process.env.FAMMO_RECAPTCHA_SECRET;

router.get('/login', (req, res) => {
    if (req.session?.username) {
        res.redirect('/game');
    } else {
        res.render('login');
    }
});

router.post('/login', (req, res) => {
    console.log("LOGIN REQUEST");

    // reCAPTCHA Verification
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaKey}&response=${req.body.captcha}`;
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
});

module.exports = router;
