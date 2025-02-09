const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const dsheet = require('../../engine/datasheet.js');

router.post('/createChar', [
    body('name').trim().escape().isLength({ min: 3, max: 15 }).withMessage('Character name must be between 3 and 15 characters'),
    body('strength').isInt({ min: 0, max: 100 }).withMessage('Strength must be between 1 and 100'),
    body('constitution').isInt({ min: 0, max: 100 }).withMessage('Constitution must be between 1 and 100'),
    body('dexterity').isInt({ min: 0, max: 100 }).withMessage('Dexterity must be between 1 and 100'),
    body('intelligence').isInt({ min: 0, max: 100 }).withMessage('Intelligence must be between 1 and 100'),
    body('focus').isInt({ min: 0, max: 100 }).withMessage('Focus must be between 1 and 100'),
    body('agility').isInt({ min: 0, max: 100 }).withMessage('Agility must be between 1 and 100'),
    body('class').isLength({ min: 1 }).withMessage('Class is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.redirect('/game?errormsg=' + errors.array()[0].msg);
    }

    const { name, strength, constitution, dexterity, intelligence, focus, agility, class: characterClass, charImg } = req.body;
    const stats = { strength, constitution, dexterity, intelligence, focus, agility };

    dsheet.createCharacter(name, req.session.username, stats, characterClass, charImg, (result) => {
        if (result[0]) {
            res.redirect('/game');
        } else {
            res.redirect('/game?errormsg=' + result[1]);
        }
    });
});

module.exports = router;
