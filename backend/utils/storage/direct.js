const fs = require('fs')
const path = require('path')
const debug = require('debug')('coding:utils:direct')

class DirectWorkDir {
    constructor(dir) {
        this.dir = dir;
    }
    async readFile(fileName) {
        if(fs.existsSync(fileName)) {
            throw new Error(`File ${fileName} does not exist`);
        }
        return await fs.promises.readFile(path.join(this.dir, fileName));
    }
    async uploadFile(fileName, content) {
        let fullPath = path.join(this.dir, fileName);
        debug(`Update ${fullPath}`);
        let fileDir = path.dirname(fullPath);
        await fs.promises.mkdir(fileDir, { recursive: true });
        await fs.promises.writeFile(fullPath, content)
    }
}

const workdir = (dir) => {
    return new Promise((resolve, reject) => {
        resolve(new DirectWorkDir(dir));
    })
}

module.exports = {
    workdir
}