const blocklist = require('../engine/blocklist.js');

module.exports = (req, res, next) => {
    const clientip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    if (blocklist.checkIp(clientip)) {
        return res.status(403).send('Forbidden');
    }
    next();
};
