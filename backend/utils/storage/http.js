const axios = require('axios')
const debug = require('debug')('coding:utils:http')
const cacheRegister = require('../cache-register')

const Waiting = require('../../utils/wait2')
const NodeCache = require( "node-cache" )

const CACHE_TIME = process.env.CACHE_TIME || (60 * 60);
const cache = new NodeCache({ stdTTL: CACHE_TIME, checkperiod: 600, useClones: false });
const waits = new Waiting();

cacheRegister.register(cache);

class HttpWorkDir {
    constructor(cid, dir, config) {
        this.cid = cid;
        this.dir = dir;
        this.url = config.url;
        this.username = config.username;
        this.password = config.password;
        this.token = config.token; // TODO
        if(!this.url.endsWith('/'))
            this.url += '/';
    }
    async readFile(fileName) {
        const fileUrl = this.url + fileName;
        const cacheId = this.cid + "|" + fileUrl;
        let existing = cache.get(cacheId);
        if(existing) {
            cache.ttl(cacheId);
            return existing;
        }

        let content = await waits.join(cacheId, async all => {
            debug(`Load ${fileUrl} from external service`);

            let config = {};
            if(this.username && this.password) {
                config.auth = {
                    username: this.username,
                    password: this.password
                };
            }

            try {
                let response = await axios.get(fileUrl, config);
                if(response.status == 200) { // NOTE: what happens in case of JSON?
                    if(!process.env.DISABLE_FILE_CACHE) {
                        cache.set(cacheId, response.data);
                    }
                    all.resolve(response.data);
                }
            } catch(err) {
                debug(`Could not load file ${fileUrl} from external service: ${err.stack ? err.stack : err}`);
                all.reject(err);
            }
        });

        return content;
    }
}

const workdir = (dir, config, cid) => {
    return new Promise((resolve, reject) => {
        resolve(new HttpWorkDir(cid, dir, config));
    })
}

module.exports = {
    workdir
}