/**
 * Simple tool to sync multiple request to wait for same
 * requested static information to be cached. By calling
 * join, the first one gets true and allows to start with
 * loading, everybody else gets false and should not 
 * start with loading content. If the first loader is done,
 * he has to call forEachResolve or forEachReject to inform
 * everybody else and finally done to remove this wait list.
 */
const debug = require('debug')('coding:utils:wait')

class Waiting {
    constructor() {
        this.waiters = {};
    }

    /**
     * Ask to join a waiting group. If this group, identified by id, does not exist, than true is returned. Otherwise, return is false.
     * 
     * @param {string} id 
     * @param {function(*)} resolve 
     * @param {function(*)} reject 
     */
    join(id, resolve, reject) {
        if(this.waiters[id]) {
            this.waiters[id].push([resolve, reject]);
            return false;
        }
        debug(`Init processing waiter for ${id}`)
        this.waiters[id] = [[resolve, reject]];
        return true;
    }

    /**
     * Iterates over each resolve callback managed in this the waiting group identified by id. Callback is invoked with each resolve.
     * 
     * @param {string} id 
     * @param {function(*)} callback 
     */
    forEachResolve(id, callback) {
        debug(`Resolve all waiters for ${id}(${(this.waiters[id] || []).length})`);
        (this.waiters[id] || []).forEach(el => {
            try {
                callback(el[0])
            } catch(err) {
                debug(err)
            }
        })
        this.done(id);
        return this;
    }

    /**
     * Iterates over each reject callback managed in this the waiting group identified by id. Callback is invoked with each reject.
     * 
     * @param {string} id 
     * @param {function(*)} callback 
     */
    forEachReject(id, callback) {
        debug(`Reject all waiters for ${id}(${(this.waiters[id] || []).length})`);
        (this.waiters[id] || []).forEach(el => {
            try {
                callback(el[1])
            } catch(err) {
                debug(err)
            }
        })
        this.done(id);
        return this;
    }

    /**
     * Closes a group identified by id, can be called manually. Groups are closed automaticly after forEachReject or forEachResolve.
     * 
     * @param {string} id 
     */
    done(id) {
        this.waiters[id] = undefined;
    }
}

module.exports = Waiting