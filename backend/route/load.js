const express = require('express')
const path = require('path')
const router = express.Router()
const workdirs = require('../utils/workdirs')
const collection = require('../utils/collection')
const task = require('../utils/task')
const debug = require('debug')('coding:routes:task')
const loadTaskSolution = require('./helper/loadSolution')
const archiver = require('archiver')

const handleLoadRequest = async (req, res, sessionCid, nr) => {
    let cid = ((req.session.joined || {})[sessionCid] || {}).collection;
    try {
        if(!cid) {
            debug(`Requesting details for collection ${sessionCid} but could not find reference in client session`)
            return res.status(400).send({'msg': 'Unknown joining id'})
        }
        let userRef = ((req.session.joined || {})[sessionCid] || {}).userRef;

        debug(`Access details for task ${sessionCid} > ${cid}[${nr}]`);
        let workdir = await workdirs.receive(cid);
        let details = await collection.details(workdir);
        let taskPath = collection.taskPath(details, nr);
        debug(`Found workdir at ${workdir.dir} and details for collection ${cid}`);

        // is nr is numeric, than there should be an element in tasks, if its a path, than this path should be included
        if(!taskPath) {
            debug(`Task ${nr} does not exist in collection ${cid}`)
            return res.status(404).send({'msg': 'Task does not exist'});
        }

        let taskDetails = await task.details(workdir, taskPath);
        debug(`Found details for task ${taskPath} in collection ${cid}`);
        
        let files = await task.files(workdir, taskPath)
        debug(`Found ${files.length} files for task ${taskPath} in collection ${cid}`);
        
        let testFiles = await task.testFiles(workdir, taskPath);
        debug(`Found ${testFiles.length} test files for task ${taskPath} in collection ${cid}`);

        let additionalFiles = await task.additionalFiles(workdir, taskPath);
        debug(`Found ${additionalFiles.length} additional files for task ${taskPath} in collection ${cid}`);

        let srcBase = taskDetails.srcBase || "";
        let testBase = taskDetails.testBase || "";

        const solution = await loadTaskSolution(userRef, cid, taskPath);
        const arch = archiver('zip');
        files.forEach(el => {
            let content = el.content;
            if(solution && solution.sources) {
                const existing = solution.sources.find(el2 => el.path == el2.path);
                if(existing) {
                    content = existing.content;
                }
            }
            const name = srcBase ? path.join(srcBase, el.path) : el.path;
            arch.append(content, { name });
        });
        testFiles.forEach(el => {
            const name = testBase ? path.join(testBase, el.path) : el.path;
            arch.append(el.content, { name });
        });
        additionalFiles.forEach(el => {
            arch.append(el.content, { name: el.path});
        });
    
        res.attachment(nr + '.zip').type('zip');
        arch.on('end', () => res.end()); // end response when archive stream ends
        arch.pipe(res);
        arch.finalize();
    } catch(err) {
        debug(`Could not load details for task ${nr} in collection ${cid}:\n${err.stack ? err.stack : err}`)
        res.status(500).send({'msg': 'Error while opening collection'});
    }
};

router.get('/:id', (req, res) => {
    let sessionCid = req.params.id;
    if(!sessionCid) {
        return res.status(400).send({'msg': 'Missing joining id'})
    }

    handleLoadRequest(req, res, sessionCid, 0);
});

router.get('/:id/*', (req, res) => {
    let sessionCid = req.params.id;
    if(!sessionCid) {
        return res.status(400).send({'msg': 'Missing joining id'})
    }

    let path = req.path;
    let nr = path.substr(sessionCid.length + 2)
    handleLoadRequest(req, res, sessionCid, nr);
});

module.exports = router;