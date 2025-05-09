const express = require('express')
const router = express.Router()
const workdirs = require('../utils/workdirs')
const collection = require('../utils/collection')
const task = require('../utils/task')
const debug = require('debug')('coding:routes:run')
const axios = require('axios')
const config = require('../config')
const persistTaskSolution = require('./helper/persistSolution')
const callbacks = require('./helper/callback')
const filesHash = require('../utils/hash-from-files')
const { sendRunCommand } = require('../websocket/code-runner/sender/send-run-command')

const { addMeasurement } = require('./helper/measurements')

const handleRunTask = async(req, res, sessionCid, nr) => {
    try {
        const cid = ((req.session.joined || {})[sessionCid] || {}).collection;
        if (!cid) {
            debug(`Requesting details for collection with ref ${sessionCid} but could not find reference in client session`)
            return res.status(400).send({ 'msg': 'Unknown joining id' })
        }
        const admin = ((req.session.joined || {})[sessionCid] || {}).admin;
        const userRef = ((req.session.joined || {})[sessionCid] || {}).userRef;
        const accessRef = ((req.session.joined || {})[sessionCid] || {}).key;

        const sources = req.body.sources;
        if (!sources || !sources.length) {
            debug(`Nothing to execute for collection ${cid}`)
            return res.status(400).send({ 'msg': 'No sources in request' })
        }

        debug(`Access details for task in order to run ${sessionCid} > ${cid}[${nr}]`);
        const workdir = await workdirs.receive(cid);
        const details = await collection.details(workdir);
        const taskPath = collection.taskPath(details, nr);

        if (!taskPath) {
            debug(`Task ${nr} does not exist in collection ${cid}`)
            return res.status(404).send({ 'msg': 'Task does not exist' });
        }

        debug(`Persist solution ${sessionCid} > ${cid}[${nr}]`);
        try {
            // Don't save if we use this as admin
            if (!admin) {
                await persistTaskSolution(userRef, req.body.customRef || req.session.customRef, cid, taskPath, sources);
            }
        } catch (err) {
            debug(`Could not persist ${cid}[${taskPath}]: ${err.stack ? err.stack : err}`);
        }

        const taskDetails = await task.details(workdir, taskPath)
        const runWith = taskDetails.runWith || details.runWith || workdir.runWith;
        const testWith = taskDetails.testWith || details.testWith || workdir.testWith;
        const mainClass = taskDetails.mainClass;
        const mainScript = taskDetails.mainScript;
        const maxTimeInMs = taskDetails.maxTimeInMs || 2000;
        const runner = config.get("runners", {})[runWith];
        const context = req.query.context ? req.query.context + ':' : '';

        if (!runner) {
            debug(`Unknown runner ${runWith}`)
            return res.status(500).send({ 'msg': 'Unknown runner' });
        }

        let files = await task.files(workdir, taskPath);
        // Replace edited files with repository files
        files = files.map(el => {
            let modified = (sources || []).find((el2) => el.path == el2.filename);
            return modified
              ? { filename: el.path, content: modified.content }
              : {
                  filename: el.path,
                  content: el.content,
                };
        });

        // Create message data
        const runData = {
            cmd: runWith,
            mainfilename: mainScript || mainClass,
            sourcefiles: files,
        };

        // Call code runner
        debug(`Call runner ${runner} with ${mainClass||mainScript} (max ${maxTimeInMs} ms)`)
        try {
            const start = new Date().getTime();
            const response = await sendRunCommand(
              req.sessionID,
              {
                type: "execute/run",
                data: runData,
              }            
            );
            debug(`Receive response from runner ${runner} for ${mainClass||mainScript} after ${new Date().getTime() - start} ms`);
            let isResponseSuccess = response.success === true;
            let runResultString = isResponseSuccess ? "run-done" : "run-failed";
            await addMeasurement(runResultString, userRef, req.body.customRef || req.session.customRef, cid, taskPath, accessRef);
            
            callbacks.log('coding-ars', context + taskPath, runResultString,
                ((req.session.joined || {})[sessionCid] || {}).callback,
                ((req.session.joined || {})[sessionCid] || {}).contentId);

            // Don't save if this is used as admin
            if (!admin && !testWith) {
                await persistTaskSolution(userRef, req.body.customRef || req.session.customRef, cid, taskPath, sources, true);
            }

            const fh = filesHash(sources);
            req.session.results = req.session.results || {};
            req.session.results[sessionCid] = req.session.results[sessionCid] || {};
            req.session.results[sessionCid][fh] = { success: isResponseSuccess };
            debug("Persist result for solution", fh, req.session.results[sessionCid][fh]);

            res.status(response.status).send({ success: isResponseSuccess });
        } catch (err) {
            debug(`Couldn't call runner ${runner}`)
            return res.status(500).send({ 'msg': 'Error while calling runner' });
        }
    } catch (err) {
        debug(`Could load details for task ${nr} in collection ${cid}:\n${err.stack ? err.stack : err}`)
        return res.status(500).send({ 'msg': 'Error while opening collection' });
    }
}

router.post('/:id', (req, res) => {
    const sessionCid = req.params.id;
    if (!sessionCid) {
        return res.status(400).send({ 'msg': 'Missing joining id' })
    }

    handleRunTask(req, res, sessionCid, 0);
});

router.post('/:id/*', (req, res) => {
    const sessionCid = req.params.id;
    if (!sessionCid) {
        return res.status(400).send({ 'msg': 'Missing joining id' })
    }

    const path = req.path;
    const nr = path.substr(sessionCid.length + 2)
    handleRunTask(req, res, sessionCid, nr);
});

module.exports = router;