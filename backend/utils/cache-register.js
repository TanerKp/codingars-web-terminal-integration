const debug = require('debug')('coding:utils:cache-register')

const caches = [];
module.exports = {
    register: (cache) => {
        caches.push(cache);
    },
    clean: (prefix) => {
        setTimeout(() => {
            debug(`Start cleanup for ${prefix}`);
            caches.forEach(cache => {
                cache.keys().forEach(key => {
                    if(key.startsWith(prefix)) {
                        cache.del(key);
                    }
                })
            })
        })
    }
}