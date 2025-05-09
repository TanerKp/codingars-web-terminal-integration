/**
 * Helper script for loading details from repository, e. g., 
 * loading collection.yaml content as well as
 * all related tasks.
 * 
 * In case of not existing collection.yaml and existing 
 * folder: current folder is assumed as a task folder.
 * Thus, empty collection configuration is returend with 
 * one task at '.' (single task collections).
 */

const yaml = require('js-yaml')
const debug = require('debug')('coding:utils:collection')
const tasks = require('./task')
const cacheRegister = require('./cache-register')
const isNumeric = require('../utils/helper').isNumeric

// We don't want a full group of 50 users to parallel create
// uncached entries. Thus, first request create required
// informations, everybody else has to wait for this result.
const Waiting = require('../utils/wait2')
const NodeCache = require( "node-cache" )

const CACHE_TIME = process.env.CACHE_TIME || (60 * 60);
const cache = new NodeCache({ stdTTL: CACHE_TIME, checkperiod: 600, useClones: false });
const waits = new Waiting();

cacheRegister.register(cache);

const empty = function () {
    return { tasks: ['.'] };
}

/**
 * Try to find collection.yaml in workdir. If folder does not 
 * exist, reject. If file does not exist, return with empty 
 * detail configuration, pointing to one task in same folder.
 * 
 * @param {*} workdir 
 */
const internalDetails = async (workdir) => {
    let cacheId = workdir.cid + "-details";
    let existing = cache.get(cacheId);
    if(existing) {
        cache.ttl(cacheId);
        return existing;
    }

    let details = await waits.join(cacheId, async all => {
        debug(`Load collection details ${workdir.dir}`)
        let d;
        try {
            let content = await workdir.readFile('collection.yaml');
            d = yaml.load(content);
        } catch (e) {
            debug(`Error while reading ${cacheId}:\n${e.stack}`)
            d = empty();
        }
        if(!process.env.DISABLE_FILE_CACHE) {
            cache.set(cacheId, d);
        }
        all.resolve(d);
    });
    return details;
};

const details = async (workdir, includeTasks) => {
    let d = await internalDetails(workdir)
    if(includeTasks) {
        let cacheId = workdir.cid + "-withTasks";
        let existing = cache.get(cacheId);
        if(existing) {
            cache.ttl(cacheId);
            return existing;
        }

        let detailsWithTasks = await waits.join(cacheId, async all => {
            d = JSON.parse(JSON.stringify(d));
            let taskPromisses = [];
            d.tasks.forEach(el => {
                taskPromisses.push(tasks.details(workdir, el));
            })
            try {
                let results = await Promise.all(taskPromisses);
                d.tasks = results;
                if(!process.env.DISABLE_FILE_CACHE) {
                    cache.set(cacheId, d);
                }
                all.resolve(d);
            } catch(err) {
                all.reject(err);
            }
        })
        return detailsWithTasks;
    }
    return d;
}

const taskPath = (d, nr) => {
    let isNumericRef = isNumeric(nr);
    if(isNumericRef) {
        nr = parseInt(nr);
    }

    if(!(isNumericRef && d.tasks[nr]) && !(!isNumericRef && d.tasks.findIndex(el => el == nr) != -1)) {
        return undefined;
    }

    return isNumericRef ? d.tasks[nr] : nr;
}

module.exports = {
    details,
    taskPath
}