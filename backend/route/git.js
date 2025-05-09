const express = require('express')
const router = express.Router()
const workdirs = require('../utils/workdirs')
const cacheRegister = require('../utils/cache-register')
const debug = require('debug')('coding:routes:git')

const Collection = require('../model/collection');

router.get('/:cid/commit/:hash', async (req, res) => {
    let cid = req.params.cid;
    let hash = req.params.hash;
    if (!cid) {
        return res.status(400).send({ 'msg': 'Missing collection id' })
    }

    debug(`Start update collection ${cid}`);
    let collection
    try {
        collection = await Collection.findById(cid).exec();
        if (!collection) {
            return res.status(404).send({ 'msg': `Could not find collection ${cid}` })
        }
    } catch(err) {
        return res.status(500).send({ 'msg': `Could not load collection ${cid}` });
    }

    // Check if this collection uses git as storage backend
    if (collection.storage.get('type') != Collection.GIT_STORAGE_TYPE) {
        return res.status(400).send({ 'msg': `This is not a git based collection ${cid}` });
    }

    debug(`Update collection ${cid} to ${hash}`);
    try {
        let workdir = await workdirs.receive(collection);
        let oldHash = await workdir.storage.currentCommit();

        if (oldHash == hash) {
            return res.status(400).send({ 'msg': `Collection commit is already at ${hash}` })
        }

        await workdir.storage.fetch();
        await workdir.storage.checkout(hash);

        let currentHash = await workdir.storage.currentCommit()

        if (oldHash == currentHash) {
            res.status(500).send({ 'msg': `Could not update collection to ${hash}` })
            return;
        }

        collection.storage.commit = currentHash;
        await collection.save();

        // Clean up caches with entries using cid as key prefix
        cacheRegister.clean(cid);
        
        res.status(204).send();
    } catch(err) {
        debug(`Error while updating repo to commit ${hash} in repository for collection ${cid}:\n${err.stack ? err.stack : err}`);
        return res.status(500).send({ 'msg': 'Error while performing updates' });
    }
});

module.exports = router;