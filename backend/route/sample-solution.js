const express = require('express')
const router = express.Router()
const workdirs = require('../utils/workdirs')
const collection = require('../utils/collection')
const task = require('../utils/task')
const debug = require('debug')('coding:routes:sample-solution')
const loadTaskSolution = require('./helper/loadSolution')
const persistTaskSolution = require('./helper/persistSolution')
const { addMeasurement } = require('./helper/measurements')

router.get('/:id/*', async (req, res) => {
    const sessionCid = req.params.id;
    if(!sessionCid) {
        return res.status(400).send({'msg': 'Missing joining id'})
    }

    let cid;
    try {
        const path = req.path;
        const nr = path.substr(sessionCid.length + 2)
        
        cid = ((req.session.joined || {})[sessionCid] || {}).collection;
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

        const taskDetails = await task.details(workdir, taskPath);
        debug(`Found details for task ${taskPath} in collection ${cid}`);

        if(!taskDetails.allowSampleSolution) {
            debug(`Task ${nr} does not allow sample solution in collection ${cid}`)
            return res.status(404).send({'msg': 'Sample solution does not exist'});
        }
        
        const files = await task.sampleSolutionFiles(workdir, taskPath)
        debug(`Found ${files.length} files for task ${taskPath} in collection ${cid}`);

        try {
            // Mark user for sample usage
            const solution = await loadTaskSolution(userRef, cid, taskPath);

            if(!solution.testsOk) {
                await addMeasurement('load-sample-before', userRef, req.body.customRef || req.session.customRef, cid, taskPath, accessRef);
                await persistTaskSolution(userRef, req.body.customRef || req.session.customRef, cid, taskPath, undefined, undefined, true);
            } else {
                await addMeasurement('load-sample-after', userRef, req.body.customRef || req.session.customRef, cid, taskPath, accessRef);
            }
        } catch(err) {
            debug(`Could not persist ${cid}[${taskPath}]: ${err.stack ? err.stack : err}`);
        }

        res.send({files})
    } catch(err) {
        debug(`Could not load details for task ${nr} in collection ${cid}:\n${err.stack ? err.stack : err}`)
        res.status(500).send({'msg': 'Error while opening collection'});
    }
});

module.exports = router;