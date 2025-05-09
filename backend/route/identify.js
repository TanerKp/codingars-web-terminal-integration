const express = require('express')
const router = express.Router()
const debug = require('debug')('coding:routes:identify')
const token = require('../utils/token.js')
const config = require('../config')
const Solution = require('../model/solution')

router.post('/:id', async(req, res) => {
    try {
        let id = req.params.id;
        let decoded = await token.verify(req.body.token);
        let userRef = decoded.data.userRef;
        if (userRef) {
            debug(`Received new user reference`)
            if (req.session.joined[id]) {
                // Update existing solutions from this session to 
                // claim them by this user
                let currentSessionUserRef = req.session.joined[id].userRef;
                if (currentSessionUserRef.startsWith("generic-")) {
                    await Solution.updateMany({ userRef: currentSessionUserRef }, {
                        userRef: userRef
                    }, {}).exec();
                }
                debug(`Switch from ${currentSessionUserRef} to ${userRef}`)
                req.session.joined[id].userRef = userRef;
                // use callback identifier or callback as url
                req.session.joined[id].callback = config.get("callbacks", {})[decoded.data.callback] || decoded.data.callback;
                debug(`Use callback ${req.session.joined[id].callback} to ${userRef}`)
                if (!req.session.joined[id].callback || !req.session.joined[id].callback.startsWith('http')) {
                    debug(`Unknown callback ${req.session.joined[id].callback}`);
                    req.session.joined[id].callback = undefined;
                }
                req.session.joined[id].contentId = decoded.data.content;
            }
            req.session.userRef = userRef;
        }
        if (decoded.customRef) {
            req.session.customRef = decoded.customRef;
        }
        res.status(204).send();
    } catch (err) {
        debug(`Error while verifying token:\n${err.stack ? err.stack : err}`);
        return res.status(403).send({ 'msg': 'Bad token provided' });
    }
});

module.exports = router;