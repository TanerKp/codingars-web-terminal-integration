const jwt = require('jsonwebtoken')
const config = require('../config')
const debug = require('debug')('coding:utils:token')

const DEFAULT_SECRET = "SUPER_SECRET!";
const SECRET = config.get("secret", DEFAULT_SECRET);
if(SECRET == DEFAULT_SECRET) {
    debug(`WARN: Configurate secret in config.json!`)
}

module.exports = {
    verify: (token) => {
        return new Promise((resolve, reject) => {
            jwt.verify(token, SECRET, function(err, decoded) {
                if(err) {
                    reject(err);
                } else {
                    resolve(decoded);
                }
            });
        })
    },
    create: (userRef, customRef) => {
        return new Promise((resolve, reject) => {
            resolve(jwt.sign({ exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24), data: {userRef, customRef} }, SECRET));
        })
    }
}