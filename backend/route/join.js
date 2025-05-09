const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const debug = require('debug')('coding:routes:join')

const Session = require('../model/session');

router.get('/:key', async (req, res) => {
    const key = req.params.key;
    if(!key) {
        return res.status(400).send();
    }
    debug(`Joining session for collection ${key}`)
    try {
        const data = await Session.findOne({key}).exec();
        if(!data) {
            return res.status(404).send({'msg': `Couldn't find ${key}`});
        }

        if(!req.session.genericUserRef) {
            req.session.genericUserRef = "generic-" + uuidv4();
        }

        const id = uuidv4();
        req.session.joined = req.session.joined || {};
        req.session.joined[id] = {
            key,
            focus: data.focus,
            collection: data.collectionRef,
            userRef: req.session.userRef || req.session.genericUserRef
        };
        debug(`Join with reference ${key} into ${data.collectionRef} as ${req.session.joined[id].userRef}`)
        res.status(200).send({id});
    } catch(err) {
        debug(`Couldn't join session ${key}, error while looking in db:\n${err.stack ? err.stack : err}`);
        return res.status(500).send({'msg': 'Error while requesting session'});
    }
});

router.post('/admin', async (req, res) => {
    const cid = req.body.collection;
    if(!cid) {
        return res.status(400).send();
    }
    debug(`Admin collection ${cid}`)
    try {
        const id = uuidv4();

        if(!req.session.genericUserRef) {
            req.session.genericUserRef = "generic-" + uuidv4();
        }

        req.session.joined = req.session.joined || {};
        req.session.joined[id] = {
            key: cid.substr(0, 6),
            focus: [],
            collection: cid,
            admin: true,
            userRef: req.session.userRef || req.session.genericUserRef
        };
        debug(`Admin with reference ${id}@${req.session.joined[id].key} into ${cid} as ${req.session.joined[id].userRef}`)
        res.status(200).send({id});
    } catch(err) {
        debug(`Couldn't admin collection ${cid}, error while looking in db:\n${err.stack ? err.stack : err}`);
        return res.status(500).send({'msg': 'Error while requesting session'});
    }
});

module.exports = router;