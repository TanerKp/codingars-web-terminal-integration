const express = require('express')
const router = express.Router()
const workdirs = require('../utils/workdirs')
const collection = require('../utils/collection')
const debug = require('debug')('coding:routes:task')
const persistTaskSolution = require('./helper/persistSolution')

const handleSaveTask = async (req, res, sessionCid, nr) => {
    const cid = ((req.session.joined || {})[sessionCid] || {}).collection;
    try {
        if(!cid) {
            debug(`Requesting details for collection with ref ${sessionCid} but could not find reference in client session`)
            return res.status(400).send({ 'msg': 'Unknown joining id' })
        }
        const admin = ((req.session.joined || {})[sessionCid] || {}).admin;
        if(admin) {
            res.status(204).send();
        }

        const userRef = ((req.session.joined || {})[sessionCid] || {}).userRef;
        
        const sources = req.body.sources;
        if(!sources || !sources.length) {
            debug(`Nothing to execute for collection ${cid}`)
            return res.status(400).send({ 'msg': 'No sources in request' })
        }
    
        debug(`Access details for task in order to run ${sessionCid} > ${cid}[${nr}]`);
        const workdir = await workdirs.receive(cid);
        const details = await collection.details(workdir);
        const taskPath = collection.taskPath(details, nr);

        if(!taskPath) {
            debug(`Task ${nr} does not exist in collection ${cid}`)
            return res.status(404).send({'msg': 'Task does not exist'});
        }

        debug(`Persist solution ${sessionCid} > ${cid}[${nr}]`);
        try {
            await persistTaskSolution(userRef, req.body.customRef || req.session.customRef, cid, taskPath, sources);
        } catch(err) {
            debug(`Could not persist ${cid}[${taskPath}]: ${err.stack ? err.stack : err}`);
        }

        res.status(204).send();
    } catch(err) {
        debug(`Could load details for task ${nr} in collection ${cid}:\n${err.stack ? err.stack : err}`)
        return res.status(500).send({'msg': 'Error while opening collection'});
    }
}

router.post('/:id', (req, res) => {
    const sessionCid = req.params.id;
    if(!sessionCid) {
        return res.status(400).send({ 'msg': 'Missing joining id' })
    }

    handleSaveTask(req, res, sessionCid, 0);
});

router.post('/:id/*', (req, res) => {
    const sessionCid = req.params.id;
    if(!sessionCid) {
        return res.status(400).send({ 'msg': 'Missing joining id' })
    }

    const path = req.path;
    const nr = path.substr(sessionCid.length + 2)
    handleSaveTask(req, res, sessionCid, nr);
});

module.exports = router;