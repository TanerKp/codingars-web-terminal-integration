const express = require('express')
const router = express.Router()
const workdirs = require('../utils/workdirs')
const collection = require('../utils/collection')
const task = require('../utils/task')
const debug = require('debug')('coding:routes:task')
const loadTaskSolution = require('./helper/loadSolution')
const { addMeasurement } = require('./helper/measurements')
const { minScoreRatio, maxScoreTotal } = require('./helper/code-review')

const handleTaskRequest = async (req, res, sessionCid, nr) => {
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

        const taskDetails = await task.details(workdir, taskPath);
        debug(`Found details for task ${taskPath} in collection ${cid}`);
        
        const files = await task.files(workdir, taskPath);
        debug(`Found ${files.length} files for task ${taskPath} in collection ${cid}`);
        
        const testFiles = await task.testFiles(workdir, taskPath);
        debug(`Found ${files.length} test files for task ${taskPath} in collection ${cid}`);

        const runWith = taskDetails.runWith || details.runWith || workdir.runWith;
        const testWith = taskDetails.testWith || details.testWith || workdir.testWith;
        const solution = await loadTaskSolution(userRef, cid, taskPath);

        await addMeasurement('task', userRef, req.body.customRef || req.session.customRef, cid, taskPath, accessRef);

        const maxScore = maxScoreTotal(taskDetails);
        const minScore = minScoreRatio(taskDetails) * maxScore;
        if(taskDetails.useCodeReview) {
            debug(`Task ${taskPath} in collection ${cid} uses code review and has a min score of ${minScore} and max score of ${maxScore}`);
        }

        res.send({
            title: taskDetails.title,
            description: taskDetails.description,
            useCodeReview: taskDetails.useCodeReview,
            minScore,
            maxScore,
            allowSampleSolution: taskDetails.allowSampleSolution,
            name: taskPath,
            nr: details.tasks.findIndex(el => el == taskPath),
            files,
            testFiles,
            canRun: !!runWith,
            canTest: !!testWith,
            sources: solution.sources,
            testsOk: solution.testsOk,
            thumbUps: solution.thumbUps,
            usedSamples: solution.usedSamples
        })
    } catch(err) {
        debug(`Could not load details for task ${nr} in collection ${cid}:\n${err.stack ? err.stack : err}`)
        res.status(500).send({'msg': 'Error while opening collection'});
    }
};

router.get('/:id', (req, res) => {
    const sessionCid = req.params.id;
    if(!sessionCid) {
        return res.status(400).send({'msg': 'Missing joining id'})
    }

    handleTaskRequest(req, res, sessionCid, 0);
});

router.get('/:id/*', (req, res) => {
    const sessionCid = req.params.id;
    if(!sessionCid) {
        return res.status(400).send({'msg': 'Missing joining id'})
    }

    const path = req.path;
    const nr = path.substr(sessionCid.length + 2)
    handleTaskRequest(req, res, sessionCid, nr);
});

module.exports = router;