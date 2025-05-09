const mongoose = require('mongoose');

module.exports = mongoose.model('TaskCollection', {
    runWith: {
        type: String,
        required: false
    },
    secret: {
        type: String,
        required: false
    },
    testWith: {
        type: String,
        required: false
    },
    storage: {
        type: Map,
        required: true
    }
});

module.exports.GIT_STORAGE_TYPE = 'git'
module.exports.HTTP_STORAGE_TYPE = 'http'
module.exports.DIRECT_STORAGE_TYPE = 'direct'