const crypto = require('crypto');
module.exports = (files) => {
    const hash = crypto.createHash('sha256');
    for (let file of files) {
        hash.update(file.content);
    }
    return hash.digest('hex');
};