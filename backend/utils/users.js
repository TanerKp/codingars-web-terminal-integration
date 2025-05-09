const fs = require('fs');
const crypto = require('crypto');
const config = require('../config');
const debug = require('debug')('coding:utils:users');

const DISABLED_AUTHENTIFICATION = "none";
const DEFAULT_AUTHENTIFICATION = DISABLED_AUTHENTIFICATION;
const AUTHENTIFICATION = config.get("authentification", DEFAULT_AUTHENTIFICATION);
if(AUTHENTIFICATION == DEFAULT_AUTHENTIFICATION) {
    debug(`WARN: Authentification is disabled, everyone can create task collections`)
}

const DEFAULT_USERS_FILE = "users.json";
const USERS_FILE = config.get("user", DEFAULT_USERS_FILE);

module.exports = {
    verify: (credentials) => {
        if(DISABLED_AUTHENTIFICATION == AUTHENTIFICATION) {
            return true;
        }
        if(!fs.existsSync(USERS_FILE)) {
            return false;
        }

        const rawdata = fs.readFileSync(USERS_FILE);
        const users = JSON.parse(rawdata);
        const user = users[credentials.user];
        if (user) {
            const code = crypto.createHash('sha256').update(credentials.password).digest('base64');
            if((user.passwords || []).filter(el => el == code).length >= 1) {
                return true;
            }
        }
        return false;
    },
    add: (credentials) => {
        let rawdata, users;
        if(fs.existsSync(USERS_FILE)) {
            rawdata = fs.readFileSync(USERS_FILE);
            users = JSON.parse(rawdata);
        } else {
            users = {};
        }

        const code = crypto.createHash('sha256').update(credentials.password).digest('base64');
        users[credentials.user] = users[credentials.user] || {};
        if(!Array.isArray(users[credentials.user].passwords)) {
            users[credentials.user].passwords = [];
        }
        users[credentials.user].passwords.push(code);
        rawdata = JSON.stringify(users);
        fs.writeFileSync('users.json', rawdata);
    }
};