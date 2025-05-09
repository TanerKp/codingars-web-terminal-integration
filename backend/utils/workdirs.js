/**
 * Helper to manage local workdirs by using collections.
 * Loads (if not already provided) collections from db
 * and recreates a local workdir by using the git-util.
 */

const path = require('path')
const fs = require('fs')
const gitStorage = require('./storage/git')
const httpStorage = require('./storage/http')
const directStorage = require('./storage/direct')
const debug = require('debug')('coding:utils:workdirs')
const cacheRegister = require('./cache-register')

const Collection = require('../model/collection')
const Waiting = require('../utils/wait2')
const NodeCache = require( "node-cache" )

const CACHE_TIME = process.env.CACHE_TIME || (60 * 60);
const WORKDIR_TIME = process.env.WORKDIR_TIME || (7 * 24 * 60 * 60);
const cache = new NodeCache({ stdTTL: CACHE_TIME, checkperiod: 600, useClones: false });
const folderMonitor = new NodeCache({ stdTTL: WORKDIR_TIME, checkperiod: 600, useClones: false });
const waits = new Waiting();

cacheRegister.register(cache);

class CollectionWorkDir {
    constructor(dir, runWith, testWith, storage, type, cid) {
        this.dir = dir;
        this.runWith = runWith;
        this.testWith = testWith;
        this.storage = storage;
        this.type = type;
        this.cid = cid;
    }
    readFile(file) {
        return this.storage.readFile(file);
    }
}

// Ref: https://stackoverflow.com/a/24594123
const getDirectories = source =>
  fs.existsSync(source) ? fs.readdirSync(source, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name) : []

const getBasePath = () => path.join(process.cwd(), process.env.WORKDIR_PATH || 'workdirs');

const list = () => getDirectories(getBasePath()).map(el => path.join(getBasePath(), el));

const remove = (path) => {
    if(path.startsWith(getBasePath()) && fs.existsSync(path)) {
        fs.promises.rmdir(path, { recursive: true }).then(() => {
            debug(`Removing workdir ${path}`);
        });
    } else {
        debug(`Could not remove workdir ${path}, unknown or bad location`);
    }
};

// Register old workdirs after service restart with new ttl.
// Thus, they will be deleted after one full cache time 
// period.
list().forEach(el => {
    debug(`Found old ${el}, register for folder monitor`)
    folderMonitor.set(el, 1)
})

// If folder is expired, clean up
folderMonitor.on('expired', function(key) {
    debug(`Workdir ${key} expired`)
    remove(key)
})

const createDir = async (cid, data) => {
    let type = data.storage.get('type');
    debug(`Recreate workdir based on collection ${data._id} as ${type}`)

    let storage;
    let workdirPath = path.join(getBasePath(), cid);
    if(type == Collection.GIT_STORAGE_TYPE) {
        storage = await gitStorage.workdir(data.storage.get('url'), workdirPath, data.storage.get('base'), data.storage.get('commit'));
    } else if(type == Collection.DIRECT_STORAGE_TYPE) {
        storage = await directStorage.workdir(workdirPath);
    } else if(type == Collection.HTTP_STORAGE_TYPE) {
        storage = await httpStorage.workdir(workdirPath, {
            url: data.storage.get('url'),
            username: data.storage.get('username'),
            password: data.storage.get('password'),
            token: data.storage.get('token'),
        }, cid);
    } else {
        throw new Error(`Unknown storage ${type}`);
    }

    const wd = new CollectionWorkDir(workdirPath, data.runWith, data.testWith, storage, type, cid);
    cache.set(cid, wd);
    folderMonitor.set(wd.dir, 1);
    return wd;
}

const receive = async (collection) => {
    let cid;
    if(collection instanceof Collection) {
        cid = `${collection._id}`;
    } else {
        cid = `${collection}`;
        collection = undefined;
    }

    // if there is a cache entry, resolve this
    let existing = cache.get(cid);
    if(existing) {
        cache.ttl(cid);
        folderMonitor.ttl(existing.dir);
        return existing;
    }

    let data = await waits.join(cid, async all => {
        try {
            let wd;
            if(collection) {
                wd = await createDir(cid, collection);
            } else {
                collection = await Collection.findById(cid).exec();
                wd = createDir(cid, collection);
            }
            all.resolve(wd);
        } catch(err) {
            all.reject(err);
        }
    });

    return data;
}

module.exports = {
    receive
};