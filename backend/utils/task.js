/**
 * Load task details, e. g., loading task.yaml from folder. 
 * Additionally, allows to load all files from folder based 
 * on configuration.
 */

const path = require('path')
const yaml = require('js-yaml')
const cleaner = require('../utils/cleaner')
const cacheRegister = require('./cache-register')
const debug = require('debug')('coding:utils:task')

// We don't want a full group of 50 users to parallel access
// uncached entries. Thus, first request create required
// informations, everybody else has to wait for this result.
const Waiting = require('../utils/wait2')
const NodeCache = require( "node-cache" )

const CACHE_TIME = process.env.CACHE_TIME || (60 * 60);
const cache = new NodeCache({ stdTTL: CACHE_TIME, checkperiod: 600, useClones: false });
const waits = new Waiting();

cacheRegister.register(cache);

const empty = function () {
    return {};
}

const details = async (workdir, task) => {
    let cacheId = workdir.cid + "-" + task + "-details";
    let existing = cache.get(cacheId);
    if(existing) {
        cache.ttl(cacheId);
        return existing;
    }

    let details = await waits.join(cacheId, async all => {
        debug(`Load task details ${task}`)
        let d;
        try {
            let content = await workdir.readFile(path.join(task, 'task.yaml'));
            d = yaml.load(content);
            d.name = task;
        } catch(err) {
            debug(`Couldn't load task.yaml at ${task}, use default: ${err.stack ? err.stack : err}`)
            d = empty();
        }
        if(!process.env.DISABLE_FILE_CACHE) {
            cache.set(cacheId, d);
        }
        all.resolve(d);
    });
    return details;
}

const abstractFileLoader = async (workdir, task, createFileList, base, clean, part = "files") => {
    let cacheId = workdir.cid + "-" + task + "-" + part;
    let existing = cache.get(cacheId);
    if(existing) {
        cache.ttl(cacheId);
        return existing;
    }

    // Sync calls in case of multiple parallel calls
    let result = await waits.join(cacheId, async all => {
        let files = [];
        
        // Load details from task.yaml
        let d = await details(workdir, task);
        
        debug(`Load task files for ${task}`);

        // Iterate over all files, load and clean them
        let fileList = createFileList(d); // map details to file list array
        let basePath = base(d);
        if(fileList && fileList.length) {
            for(let el of fileList) {
                let fileName = el.replace(/\//g, path.sep);
                let filePath = fileName;
                if(basePath) {
                    filePath = path.join(basePath, filePath);
                }
                let content = await workdir.readFile(path.join(task, filePath));
                content = cleaner(fileName, content, clean);
                files.push({path: fileName, content});
            }
        }

        try {
            debug(`Done loading files for ${task}`)
            if(!process.env.DISABLE_FILE_CACHE) {
                cache.set(cacheId, files);
            }
            all.resolve(files);
        } catch(err) {
            all.reject(err);
        }
    });

    return result;
}

const files = async (workdir, task) => {
    return await abstractFileLoader(
        workdir, 
        task, 
        taskDetails => taskDetails.files || [],
        taskDetails => taskDetails.srcBase,
        true
    );
}

const testFiles = async (workdir, task) => {
    return await abstractFileLoader(
        workdir, 
        task, 
        taskDetails => taskDetails.testFiles || [],
        taskDetails => taskDetails.testBase,
        false,
        "tests"
    );
}

const additionalFiles = async (workdir, task) => {
    return await abstractFileLoader(
        workdir, 
        task, 
        taskDetails => taskDetails.additionalFiles || [],
        taskDetails => "",
        false,
        "additional"
    );
}

const sampleSolutionFiles = async (workdir, task) => {
    return await abstractFileLoader(
        workdir, 
        task, 
        taskDetails => taskDetails.files || [],
        taskDetails => taskDetails.srcBase,
        false,
        "solution"
    );
}

module.exports = {
    details,
    files,
    testFiles,
    additionalFiles,
    sampleSolutionFiles
}