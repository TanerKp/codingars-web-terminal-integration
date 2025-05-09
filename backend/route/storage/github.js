/**
 * Allows to create new collections and sessions based on github repositories.
 * 
 * Usage: /github/<groupOrUser>/<repositoryName>.git?key=<accessKey>&run=<runtime>&base=<folderInRepoAsBase>&commit=<someCommitHash>&password=<password>
 * Params:
 * - key is mandatory
 * - run or test is mandatory, e. g., java, cpp, python... depends on server config
 * - base is optional
 * - commit is optional
 * - password is mandatory, if backend requires authentification (see config)
 */

const express = require('express');
const workdirs = require('../../utils/workdirs');
const users = require('../../utils/users');
const createSession = require('../../utils/create-session')
const router = express.Router();
const debug = require('debug')('coding:routes:github')
const uuidv4 = require('uuid').v4

const Collection = require('../../model/collection');

const _createSession = async (res, collection) => {
    try {
        const session = await createSession(collection);
        res.send({
            session: session.key,
            collection: collection._id
        });
    } catch(err) {
        debug(`Error while saving session for collection ${collection._id} to db:\n${err.stack ? err.stack : err}`);
        return res.status(500).send({'msg': 'Error while saving session'});
    }
};

router.get("/*", async (req, res) => {
    try {
        const backendUser = req.body.backendUser || req.query.username || "anonymous";
        const backendPass = req.body.backendPass || req.query.password;
        if(!users.verify({backendUser, backendPass})) {
            debug(`Couldn't verify credentials for username`);
            return res.status(403).send({'msg': 'Not allowed'});
        }

        const path = req.path;
        const key = req.query.key;
        const commit = req.query.commit;
        const runWith = req.query.run;
        const testWith = req.query.test;
        const base = req.query.base || undefined;
        const url = `https://${key?key+'@':''}github.com${path}`;

        debug(`Start creating session for ${key?key+'@':''}${path}`);

        // Basic configuration for git repos
        const storage = {
            type: Collection.GIT_STORAGE_TYPE,
            base,
            url
        };

        // Add commit if provided, this will be added if not provided based on HEAD
        if(commit) {
            storage.commit = commit;
        }

        // Create collection itself
        const collection = new Collection({
            storage,
            secret: uuidv4(),
            runWith,
            testWith
        });
        
        await collection.save();
        debug(`Created collection data with id ${collection._id}`);
        const workdir = await workdirs.receive(collection);
        debug(`Got new working dir for collection at ${workdir.dir}`);
        if(commit) {
            _createSession(res, collection);
        } else {
            // if we did not get a commit hash, we need to point to something
            const hash = await workdir.storage.currentCommit();
            debug(`Update collection with commit hash ${hash}`);
            collection.storage.commit = hash;
            await collection.save();
            _createSession(res, collection);
        }
    } catch(err) {
        debug(`Error creating collection ${collection._id}:\n${err.stack ? err.stack : err}`);
        return res.status(500).send({'msg': 'Error while saving collection'});
    }
});

module.exports = router;