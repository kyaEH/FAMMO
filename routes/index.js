const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    if (req.session?.username) {
        res.redirect('/game');
    } else {
        res.redirect('/login');
    }
});

module.exports = router;
