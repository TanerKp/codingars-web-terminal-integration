const express = require('express')
const router = express.Router()
const workdirs = require('../utils/workdirs')
const collection = require('../utils/collection')
const task = require('../utils/task')
const debug = require('debug')('coding:routes:task')
const { addMeasurement } = require('./helper/measurements')

const Solution = require('../model/solution')

router.get('/:id/thumb-toggle/:ref', async (req, res) => {
    const sessionCid = req.params.id;
    const cid = ((req.session.joined || {})[sessionCid] || {}).collection;
    try {
        if(!cid) {
            debug(`Requesting details for collection ${sessionCid} but could not find reference in client session`)
            return res.status(400).send({'msg': 'Unknown joining id'})
        }
        const userRef = ((req.session.joined || {})[sessionCid] || {}).userRef;
        
        const solution = await Solution.findOne({_id: req.params.ref, collectionRef: cid}).exec();
        const index = solution.thumbUps.findIndex(el => el == userRef);
        if(index == -1) {
            solution.thumbUps.push(userRef);
        } else {
            solution.thumbUps.splice(index, 1);
        }
        await solution.save();
        res.status(200).send({thumbs: solution.thumbUps.length, thumbed: index == -1});
    } catch(err) {
        debug(`Could not load details for solutions ${req.params.ref} in collection ${cid}:\n${err.stack ? err.stack : err}`)
        res.status(500).send({'msg': 'Error while opening collection'});
    }
});

const handleSolutionRequest = async (req, res, sessionCid, nr) => {
    const cid = ((req.session.joined || {})[sessionCid] || {}).collection;
    try {
        if(!cid) {
            debug(`Requesting details for collection ${sessionCid} but could not find reference in client session`)
            return res.status(400).send({'msg': 'Unknown joining id'})
        }
        const userRef = ((req.session.joined || {})[sessionCid] || {}).userRef;
        const accessRef = ((req.session.joined || {})[sessionCid] || {}).key;

        debug(`Access details for task ${sessionCid} > ${cid}[${nr}]`);
        const workdir = await workdirs.receive(cid);
        const details = await collection.details(workdir);
        const taskPath = collection.taskPath(details, nr);
        debug(`Found workdir at ${workdir.dir} and details for collection ${cid}`);

        // is nr is numeric, than there should be an element in tasks, if its a path, than this path should be included
        if(!taskPath) {
            debug(`Task ${nr} does not exist in collection ${cid}`)
            return res.status(404).send({'msg': 'Task does not exist'});
        }

        let solutions = await Solution.find({collectionRef: cid, taskRef: taskPath}).exec();
        solutions = (solutions || []).filter(el => el.testsOk).map(el => ({
            sources: el.testedSources.map(el => ({path: el.path, content: el.content})), 
            time: el.lastModification, 
            you: (el.userRef == userRef) || undefined, ref: el._id,
            thumbs: el.thumbUps.length,
            usedSamples: el.usedSamples,
            thumbed: el.thumbUps.findIndex(el => el == userRef) != -1
        }));
        if(solutions.findIndex(el => el.you) != -1) {
            await addMeasurement('solutions', userRef, req.body.customRef || req.session.customRef, cid, taskPath, accessRef);
            res.send(solutions.filter(el => !el.usedSamples))
        } else {
            res.status(400).send({'msg': 'Could not load solutions, require tested solution from current user'});
        }
    } catch(err) {
        debug(`Could not load details for solutions for task ${nr} in collection ${cid}:\n${err.stack ? err.stack : err}`)
        res.status(500).send({'msg': 'Error while opening collection'});
    }
}

router.get('/:id/details/*', async (req, res) => {
    const sessionCid = req.params.id;
    if(!sessionCid) {
        return res.status(400).send({'msg': 'Missing joining id'})
    }
    const cid = ((req.session.joined || {})[sessionCid] || {}).collection;
    const userRef = ((req.session.joined || {})[sessionCid] || {}).userRef;
    const path = req.path;
    const taskPath = path.substr(sessionCid.length + 10)
    try {
        if(!cid) {
            debug(`Missing collection id`)
            return res.status(400).send({'msg': 'Missing collection id'})
        }

        let solutions = await Solution.find({collectionRef: cid, taskRef: taskPath}).exec();
        solutions = (solutions || []).map(el => ({
            sources: el.testedSources.map(el => ({path: el.path, content: el.content})), 
            time: el.lastModification, 
            thumbs: el.thumbUps.length,
            testsOk: el.testsOk,
            thumbed: el.thumbUps.findIndex(el => el == userRef) != -1
        }));
        res.send(solutions.filter(el => !el.usedSamples))
    } catch(err) {
        debug(`Could not load details for solutions for task ${path} in collection ${cid}:\n${err.stack ? err.stack : err}`)
        res.status(500).send({'msg': 'Error while opening collection'});
    }
});

router.get('/:id', (req, res) => {
    const sessionCid = req.params.id;
    if(!sessionCid) {
        return res.status(400).send({'msg': 'Missing joining id'})
    }

    handleSolutionRequest(req, res, sessionCid, 0);
});

router.get('/:id/*', (req, res) => {
    const sessionCid = req.params.id;
    if(!sessionCid) {
        return res.status(400).send({'msg': 'Missing joining id'})
    }

    const path = req.path;
    const nr = path.substr(sessionCid.length + 2)
    handleSolutionRequest(req, res, sessionCid, nr);
});

module.exports = router;