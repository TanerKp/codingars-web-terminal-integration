const express = require('express')
const router = express.Router()
const workdirs = require('../utils/workdirs')
const collection = require('../utils/collection')
const createSession = require('../utils/create-session')
const debug = require('debug')('coding:routes:collection')

const Collection = require('../model/collection')
const Solution = require('../model/solution')
const Session = require('../model/session')

router.post('/:id/session/:key', async (req, res) => {
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

    const key = req.params.key;
    try {
        const name = req.body.name || "";
        const due = req.body.due || 0;
        const data = await Session.findOne({key}).exec();
        data.name = name.trim();
        if(data.name.length > 50) {
            data.name = data.name.substr(0, 50);
        }
        data.due = typeof due == 'number' ? due : (parseInt(due) || 0);
        await data.save();

        res.status(204).send();
    } catch(err) {
        debug(`Could not update session ${key} for collection ${cid}:\n${err.stack ? err.stack : err}`)
        res.status(500).send({'msg': 'Error while updating session for collection'});
    }
});

router.get('/:id/sessions', async (req, res) => {
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

    const sessions = await Session.find({collectionRef: cid}).exec();
    res.send(sessions.map(el => ({session: el.key, focus: el.focus, name: el.name, due: el.due})))
});

const handleCreateSession = async (req, res) => {
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
    const focusPath = path.substr(sessionCid.length + 17)

    let collection;
    try {
        collection = await Collection.findById(cid).exec();
        if (!collection) {
            res.status(404).send({ 'msg': `Could not find collection ${cid}` })
            return;
        }
    } catch(err) {
        res.status(500).send({ 'msg': `Could not load collection ${cid}` })
    }
    
    try {
        const focus = [];
        if(focusPath) {
            focus.push(focusPath);
        }
        const session = await createSession(collection, focus);
        res.send({
            session: session.key,
            focus: session.focus
        });
    } catch(err) {
        debug(`Error while saving session for collection ${collection._id} to db:\n${err.stack ? err.stack : err}`);
        return res.status(500).send({ 'msg': 'Error while creating session' });
    }
};

router.get('/:id/create-session', handleCreateSession);
router.get('/:id/create-session/*', handleCreateSession);

const loadTasks = async (sessionCid, cid) => {
    debug(`Access details for collection ${sessionCid} > ${cid}`);
    const workdir = await workdirs.receive(cid);
    const details = await collection.details(workdir, true);

    return {
        title: details.title,
        description: details.description,
        tasks: (details.tasks || []).map(el => ({ 
            title: el.title, 
            description: el.description, 
            name: el.name
        }))
    }
};

router.get('/:id/details', async (req, res) => {
    let cid; 
    const sessionCid = req.params.id;
    try {
        if (!sessionCid) {
            return res.status(400).send({ 'msg': 'Missing joining id' })
        }
    
        cid = ((req.session.joined || {})[sessionCid] || {}).collection;
        if (!cid) {
            debug(`Requesting details for collection ${sessionCid} but could not find reference in client session`)
            return res.status(400).send({ 'msg': 'Unknown joining id' })
        }

        const admin = ((req.session.joined || {})[sessionCid] || {}).admin;
        if(!admin) {
            return res.status(403).send();
        }

        const solutions = await Solution.find({collectionRef: cid}, {taskRef: 1, testsOk: 1});
        const solutionResults = {};
        solutions.forEach(el => {
            if(!solutionResults[el.taskRef]) {
                solutionResults[el.taskRef] = {ok: 0, count: 0};
            }
            if(el.testsOk) {
                solutionResults[el.taskRef].ok ++;
            }
            solutionResults[el.taskRef].count ++;
        })

        const result = await loadTasks('owner', cid);
        result.tasks.forEach(el => el.solutions = solutionResults[el.name]);
        res.send(result);
    } catch(err) {
        debug(`Could not open workdir for collection ${cid}:\n${err.stack ? err.stack : err}`)
        res.status(500).send({'msg': 'Error while loading details for collection'});
    }
});

router.get('/:id', async (req, res) => {
    let cid;
    const sessionCid = req.params.id;
    try {
        if (!sessionCid) {
            return res.status(400).send({ 'msg': 'Missing joining id' })
        }
    
        cid = ((req.session.joined || {})[sessionCid] || {}).collection;
        if (!cid) {
            debug(`Requesting details for collection ${sessionCid} but could not find reference in client session`)
            return res.status(400).send({ 'msg': 'Unknown joining id' })
        }
        const userRef = ((req.session.joined || {})[sessionCid] || {}).userRef;

        // Load tests
        const tests = {};
        if(userRef) {
            let solutions = await Solution.find({collectionRef: cid, userRef}, {taskRef: 1, testsOk: 1});
            solutions.forEach(el => tests[el.taskRef] = el.testsOk);
        }

        const details = await loadTasks(sessionCid, cid, userRef);
        const focus = ((req.session.joined || {})[sessionCid] || {}).focus;
        if(focus && focus.length) {
            details.tasks = details.tasks.filter(el => focus.find(f => f == el.name) != null);
        }
        details.tasks.forEach(el => el.testsOk = tests[el.name]);
        res.send(details);
    } catch(err) {
        debug(`Could not open workdir for collection ${cid}:\n${err.stack ? err.stack : err}`)
        res.status(500).send({'msg': 'Error while loading details for collection'});
    }
});

module.exports = router;