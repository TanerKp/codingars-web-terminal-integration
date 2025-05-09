const Session = require('../model/session');
const debug = require('debug')('coding:utils:create-session')

module.exports = (collection, focus) => {
    return new Promise((resolve, reject) => {
        Session.initSession(collection, focus).then((session) => {
            debug(`Created session for collection ${collection._id} with key ${session.key}`);
            resolve(session);
        }).catch(err => reject(err));
    })
};