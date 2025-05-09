/**
 * Allows to create new collections and sessions based on direct file transfer
 */

const express = require('express');
const router = express.Router();
const workdirs = require('../../utils/workdirs');
const createSession = require('../../utils/create-session');
const cacheRegister = require('../../utils/cache-register');
const debug = require('debug')('coding:routes:direct');
const uuidv4 = require('uuid').v4;
const users = require('../../utils/users');

const Collection = require('../../model/collection');

router.post("/", async (req, res) => {
    try {
        const backendUser = req.body.backendUser || req.query.username || "anonymous";
        const backendPass = req.body.backendPass || req.query.password;
        if(!users.verify({backendUser, backendPass})) {
            debug(`Couldn't verify credentials for username`);
            return res.status(403).send({'msg': 'Not allowed'});
        }
        
        const runWith = req.query.run || req.body.run;
        const testWith = req.query.test || req.body.test;
        
        const storage = {
            type: Collection.DIRECT_STORAGE_TYPE
        };

        const collection = new Collection({
            storage,
            secret: uuidv4(),
            runWith,
            testWith
        });
        
        debug(`Start creating session for direct storage`);
        await collection.save();
        debug(`Created collection data with id ${collection._id}`);

        const workdir = await workdirs.receive(collection);
        debug(`Got new working dir for collection at ${workdir.dir}`);

        const session = await createSession(collection)
        const sources = req.body.sources || [];
        debug(`Save files to ${workdir.dir}`);
        for(let source of sources) {
            await workdir.storage.uploadFile(source.path, source.content);
        }
        res.send({
            session: session.key,
            collection: collection._id
        });
    } catch(err) {
        debug(`Error while saving collection: ${err.stack ? err.stack : err}`);
        return res.status(500).send({'msg': 'Error while saving collection'});
    }
});

router.put("/:id", async (req, res) => {
    try {
        const backendUser = req.body.backendUser || req.query.username || "anonymous";
        const backendPass = req.body.backendPass || req.query.password;
        if(!users.verify({backendUser, backendPass})) {
            debug(`Couldn't verify credentials for username`);
            return res.status(403).send({'msg': 'Not allowed'});
        }
    
        let sources = req.body.sources || [];
        let collection = req.params.id;

        if(!collection) {
            return res.status(400).send({'msg': 'Missing collection reference'});
        }

        let workdir = await workdirs.receive(collection);
        debug(`Got new working dir for collection at ${workdir.dir}`);

        if(workdir.type != Collection.DIRECT_STORAGE_TYPE) {
            debug(`Collection ${collection} provided, which is not a direct storage`);
            return res.status(400).send({'msg': 'Can not modify collection'});
        }

        debug(`Save files to ${workdir.dir}`);
        for(let source of sources) {
            await workdir.storage.uploadFile(source.path, source.content);
        }

        cacheRegister.clean(collection);

        res.status(204).send();
    } catch(err) {
        debug(`Error while updating direct collection: ${err.stack ? err.stack : err}`);
        return res.status(500).send({'msg': 'Error while saving collection'});
    }
});

module.exports = router;