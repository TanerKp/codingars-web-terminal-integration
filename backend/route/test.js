const express = require('express')
const router = express.Router()
const workdirs = require('../utils/workdirs')
const collection = require('../utils/collection')
const task = require('../utils/task')
const debug = require('debug')('coding:routes:test')
const axios = require('axios')
const config = require('../config')
const persistTaskSolution = require('./helper/persistSolution')
const { addMeasurement } = require('./helper/measurements')
const callbacks = require('./helper/callback')
const filesHash = require('../utils/hash-from-files')

const NodeCache = require("node-cache")
const PREFLIGHT_CACHE_TIME = process.env.PREFLIGHT_CACHE_TIME || (30 * 60);
const preflightCache = new NodeCache({ stdTTL: PREFLIGHT_CACHE_TIME, checkperiod: 600, useClones: false });

const copyInFiles = (target, moreFiles, override) => {
    for (let toCopy of moreFiles) {
        const ind = target.findIndex(el => el.path == toCopy.path);
        if (ind == -1) {
            target.push(toCopy);
        } else if (override) {
            target[ind] = toCopy;
        }
    }
};

const callTester = async(tester, reqBody) => {
    // Call code tester
    debug(`Call tester ${tester} with ${reqBody.testClasses.join(', ')} (max ${reqBody.maxTimeInMs} ms)`)
    const start = new Date().getTime();
    const response = await axios.post(tester, reqBody);
    debug(`Receive response from tester ${tester} for ${reqBody.testClasses.join(', ')} after ${new Date().getTime() - start} ms`)
    response.data.testOutput = response.data.runOutput;
    response.data.runOutput = undefined;
    return response;
};

const runPreflight = async(cid, workdir, taskPath, tester, testClasses, maxTimeInMs, testFiles) => {
    const id = cid + ":" + taskPath;
    const existing = preflightCache.get(id);
    if (existing) {
        preflightCache.ttl(id);
        return existing;
    }
    debug(`Run preflight with tester ${tester} for ${testClasses.join(', ')} (max ${maxTimeInMs} ms)`)
    let files = await task.sampleSolutionFiles(workdir, taskPath);
    files = [...files]; // clone array!
    copyInFiles(files, testFiles);
    const reqBody = {
        testClasses: testClasses,
        maxTimeInMs: maxTimeInMs,
        sources: files
    };
    const result = await callTester(tester, reqBody);
    const testResults = result.data.testOutput.successfulTests.map(e => { return { type: e.type, message: e.message, expected: e.expected }; });
    if (result.failedTests && result.failedTests.length) {
        debug("Warning: Failed tests detected in preflight\n" + result.data.testOutput.failedTests.map(el => el.message).join('\n'));
    }
    preflightCache.set(id, testResults);
    return testResults;
};

const handleRunTask = async(req, res, sessionCid, nr) => {
    try {
        const cid = ((req.session.joined || {})[sessionCid] || {}).collection;
        if (!cid) {
            debug(`Requesting details for collection ${sessionCid} but could not find reference in client session`)
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
            // Don't save if this is used as admin
            if (!admin) {
                await persistTaskSolution(userRef, req.body.customRef || req.session.customRef, cid, taskPath, sources);
            }
        } catch (err) {
            debug(`Could not persist ${cid}[${taskPath}]: ${err.stack ? err.stack : err}`);
        }

        const taskDetails = await task.details(workdir, taskPath)
        const testWith = taskDetails.testWith || details.testWith || workdir.testWith;
        const maxTimeInMs = taskDetails.maxTimeInMs || 2000;
        const testClasses = taskDetails.testClasses;
        const tester = config.get("testers", {})[testWith];
        const context = req.query.context ? req.query.context + ':' : '';

        if (!tester) {
            debug(`Unknown tester ${testWith}`)
            return res.status(400).send({ 'msg': 'Unknown tester' });
        }

        if (!testClasses || !testClasses.length) {
            debug(`No tests available for ${cid}[${taskPath}]`)
            return res.status(400).send({ 'msg': 'No tests available' });
        }

        let files = await task.files(workdir, taskPath);
        // Replace edited files with repository files
        files = files.map(el => {
            let modified = (req.body.sources || []).find(el2 => el.path == el2.path);
            return modified ? { path: el.path, content: modified.content } : el;
        });

        // Attach test files and replace already provided files
        const testFiles = await task.testFiles(workdir, taskPath);
        for (let testFile of testFiles) {
            if (files.findIndex(el => el.path == testFile.path) == -1) {
                files.push(testFile);
            }
        }

        // Create request body
        const reqBody = {
            testClasses,
            maxTimeInMs,
            sources: files
        };

        // Call code tester
        debug(`Start tester ${tester} with ${testClasses.join(', ')} (max ${maxTimeInMs} ms)`)
        try {
            const preflight = await runPreflight(cid, workdir, taskPath, tester, testClasses, maxTimeInMs, testFiles);
            const response = await callTester(tester, reqBody);
            const testDone = (
                // Keine Kompilierungsfehler
                (!response.data.compileResults || !response.data.compileResults.length || !response.data.compileResults.some(item => item.errors && item.errors.length > 0))
                && 
                // Keine Testfehler
                response.data.testOutput.noOfErrors == 0
            );
            if (testDone) {
                await addMeasurement("test-done", userRef, req.body.customRef || req.session.customRef, cid, taskPath, accessRef);
                callbacks.log('coding-ars', context + taskPath, 'test-done',
                    ((req.session.joined || {})[sessionCid] || {}).callback,
                    ((req.session.joined || {})[sessionCid] || {}).contentId);
                response.data.testOutput.testsOk = true;

                // Don't save if this is used as admin
                if (!admin) {
                    await persistTaskSolution(userRef, req.body.customRef || req.session.customRef, cid, taskPath, sources, true);
                }
            } else {
                await addMeasurement("test-failed", userRef, req.body.customRef || req.session.customRef, cid, taskPath, accessRef);
                callbacks.log('coding-ars', taskPath, 'test-failed',
                    ((req.session.joined || {})[sessionCid] || {}).callback,
                    ((req.session.joined || {})[sessionCid] || {}).contentId);
            }
            response.data.testOutput.expected = preflight;
            
            // Create hash from all files
            const fh = filesHash(sources);
            req.session.results = req.session.results || {};
            req.session.results[sessionCid] = req.session.results[sessionCid] || {};
            req.session.results[sessionCid][fh] = { success: testDone };
            debug("Persist result for solution", fh, req.session.results[sessionCid][fh]);
            
            res.status(response.status).send(response.data);
        } catch (err) {
            debug(`Couldn't call tester ${tester}: ${err.stack ? err.stack : err}`)
            return res.status(500).send({ 'msg': 'Error while calling tester' });
        }
    } catch (err) {
        debug(`Could load details for task ${nr} in collection ${cid}: ${err.stack ? err.stack : err}`)
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