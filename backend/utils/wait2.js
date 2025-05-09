const debug = require('debug')('coding:utils:wait2')

class Waiting {
    constructor() {
        this.waiters = {};
    }

    join(id, action) {
        return new Promise((resolve, reject) => {
            if(this.waiters[id]) {
                this.waiters[id].push([resolve, reject]);
                return false;
            }
            debug(`Init processing waiter for ${id}`)
            this.waiters[id] = [[resolve, reject]];

            let self = this;
            let done = () => {
                self.waiters[id] = undefined;
            };
            let each = (nr, d) => {
                (self.waiters[id] || []).forEach(el => {
                    try {
                        el[nr](d)
                    } catch(err) {
                        debug(err)
                    }
                });
                done();
            }

            try {
                action({
                    resolve: result => each(0, result),
                    reject: err => each(1, err),
                    done
                })
            } catch(err) {
                each(1, err);
            }
        })
    }
}

module.exports = Waiting