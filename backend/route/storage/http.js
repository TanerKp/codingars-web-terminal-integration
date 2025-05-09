/**
 * Allows to create new collections and sessions based on github repositories.
 * 
 * Usage: /github/<groupOrUser>/<repositoryName>.git?key=<accessKey>&run=<runtime>&base=<folderInRepoAsBase>&commit=<someCommitHash>
 * Params:
 * - key is mandatory
 * - run is mandatory, e. g., java, cpp, python... depends on server config
 * - base is optional
 * - commit is optional
 */

const express = require('express');
const workdirs = require('../../utils/workdirs');
const createSession = require('../../utils/create-session')
const router = express.Router();
const debug = require('debug')('coding:routes:http')
const uuidv4 = require('uuid').v4

const Collection = require('../../model/collection');
const users = require('../../utils/users');

router.post("/", async (req, res) => {
    try {
        const backendUser = req.body.backendUser || req.query.username || "anonymous";
        const backendPass = req.body.backendPass || req.query.password;
        if(!users.verify({backendUser, backendPass})) {
            debug(`Couldn't verify credentials for username`);
            return res.status(403).send({'msg': 'Not allowed'});
        }
        
        const url = req.body.url;
        const username = req.body.username;
        const password = req.body.password;
        const token = req.body.token;
        const runWith = req.query.run || req.body.run;
        const testWith = req.query.test || req.body.test;
    
        if(!url) {
            return res.status(400).send({'msg': 'Missing URL for tasks'});
        }
        
        const storage = {
            type: Collection.HTTP_STORAGE_TYPE,
            url,
            username,
            password,
            token
        };
        const collection = new Collection({
            storage,
            secret: uuidv4(),
            runWith,
            testWith
        });
        
        debug(`Start creating session for ${url}`);
        await collection.save();

        debug(`Created collection data with id ${collection._id}`);
        let workdir = await workdirs.receive(collection);

        debug(`Got new working dir for collection at ${workdir.dir}`);
        let session = await createSession(collection);
        res.send({
            session: session.key,
            collection: collection._id
        });
    } catch(err) {
        debug(`Error while saving collection: ${err.stack ? err.stack : err}`);
        return res.status(500).send({'msg': 'Error while saving collection'});
    }
});

module.exports = router;