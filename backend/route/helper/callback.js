const axios = require('axios')
const debug = require('debug')('coding:routes:helper:callback')

module.exports = {
    log: (type, task, data, callback, contentId) => {
        try {
            if (callback && callback.startsWith('http')) {
                if (!callback.endsWith('/')) {
                    callback += '/';
                }
                callback += contentId;
                callback += '/log/';
                callback += `${type}(${task},${data})`;
                axios.get(callback).then(() => {
                    // ignore
                }).catch(err => {
                    debug(`Could not log at callback: ${err.stack ? err.stack : err}: ${callback}`)
                });
                debug(`Send log callback ${callback}`)
            } else {
                debug(`Log: ${type}(${task},${data})`);
            }
        } catch (err) {
            debug(`Could not log at callback: ${err.stack ? err.stack : err}`)
        }
    }
}