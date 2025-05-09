const mongoose = require('mongoose');
const crypto = require('crypto');

const Session = mongoose.model('TaskSession', {
    collectionRef: {
        type: mongoose.ObjectId,
        required: true
    },
    key: {
        type: String,
        required: true
    },
    focus: {
        type: [String],
        required: true
    },
    created: {
        type: Number,
        required: false
    },
    due: {
        type: Number,
        required: false
    },
    name: {
        type: String,
        required: false
    }
});

function getRandomKey(length) {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

Session.getNewKey = function() {
    return new Promise((resolve, reject) => {
        let key = getRandomKey(process.env.SESSION_KEY_LENGTH || 6);
        Session.findOne({key}, (err, data) => {
            if(err) {
                reject(err);
            } else {

                if(!data) {
                    resolve(key);
                } else {
                    Session.getNewKey().then(resolve).catch(reject);
                }
            }
        });
    })
}

Session.initSession = (collection, focus) => {
    return new Promise((resolve, reject) => {
        Session.getNewKey().then(key => {
            let session = new Session({key, collectionRef: collection._id, focus: focus || [], created: new Date().getTime()})
            session.save((err) => err ? reject(err) : resolve(session))
        })
    })
}

module.exports = Session;