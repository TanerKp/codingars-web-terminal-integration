const express = require('express')
const router = express.Router()
const debug = require('debug')('coding:routes:measurement')

const Measurement = require('../model/measurement')

const findMeasurements = async (cid, sessionKey, taskRef = undefined, since = undefined) => {
    const search = {collectionRef: cid};
    const accessRef = sessionKey;
    if(accessRef) {
        search.accessRef = accessRef;
    }
    if(taskRef) {
        search.taskRef = taskRef;
    }
    if(since) {
        search.time = {
            $gt: since
        };
    }
    
    const result = await Measurement.find(search, {time: 1, type: 1, taskRef: 1, accessRef: 1, userRef: 1}).exec();
    return result.map(el => ({time: el.time, type: el.type, task: el.taskRef, session: el.accessRef, user: el.userRef}));
};

router.get('/:id', async (req, res) => {
    const sessionCid = req.params.id;
    if (!sessionCid) {
        return res.status(400).send({ 'msg': 'Missing joining id' })
    }

    const cid = ((req.session.joined || {})[sessionCid] || {}).collection;
    if (!cid) {
        debug(`Requesting details for collection ${sessionCid} but could not find reference in client session`)
        return res.status(400).send({ 'msg': 'Unknown joining id' })
    }
    const admin = ((req.session.joined || {})[sessionCid] || {}).admin;
    if(!admin) {
        return res.status(403).send();
    }

    const accessRef = req.query.sessionKey;
    const since = Number(req.query.since || "0");
    try {
        const result = await findMeasurements(cid, accessRef, undefined, since);
        res.send(result);
    } catch(err) {
        debug(`Could not open workdir for collection ${cid}:\n${err.stack ? err.stack : err}`)
        res.status(500).send({ 'msg': `Could not load measurements for ${cid} and session key ${accessRef}` });
    }
});

router.get('/:id/*', async (req, res) => {
    const sessionCid = req.params.id;
    if (!sessionCid) {
        return res.status(400).send({ 'msg': 'Missing joining id' })
    }

    const cid = ((req.session.joined || {})[sessionCid] || {}).collection;
    if (!cid) {
        debug(`Requesting details for collection ${sessionCid} but could not find reference in client session`)
        return res.status(400).send({ 'msg': 'Unknown joining id' })
    }

    const admin = ((req.session.joined || {})[sessionCid] || {}).admin;
    if(!admin) {
        return res.status(403).send();
    }
    
    const path = req.path;
    const taskRef = path.substr(sessionCid.length + 2);
    const accessRef = req.query.sessionKey;
    const since = Number(req.query.since || "0");
    debug(`Load measurements for ${cid}.${taskRef}${accessRef ? '@' + accessRef: ''}`);
    try {
        const result = await findMeasurements(cid, accessRef, taskRef, since);
        res.send(result);
    } catch(err) {
        debug(`Could not open workdir for collection ${cid}:\n${err.stack ? err.stack : err}`)
        res.status(500).send({ 'msg': `Could not load measurements for ${cid} and session key ${accessRef}` });
    }
});


module.exports = router;