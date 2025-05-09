/**
 * Wrapper to load git repositories. Place them in local
 * workdir and provide instance of GitWorkDir with simple
 * functions to manage this dir.
 */

const git = require('isomorphic-git')
const http = require('isomorphic-git/http/node')
const fs = require('fs')
const path = require('path')
const debug = require('debug')('coding:utils:git')

class GitWorkDir {
    constructor(dir, repo, base) {
        this.dir = dir;
        this.repo = repo;
        this.base = base;
    }
    exists() {
        return fs.existsSync(this.dir);
    }
    async fetch() {
        return await git.fetch({ fs, http, dir: this.dir, url: this.repo })
    }
    async clone() {
        fs.mkdirSync(this.dir, { recursive: true });
        return await git.clone({ fs, http, dir: this.dir, url: this.repo });
    }
    async checkout(ref, force = true) {
        return await git.checkout({fs, dir: this.dir, ref, force});
    }
    async currentCommit() {
        return await git.resolveRef({ fs, dir: this.dir, ref: 'HEAD' });
    }
    async readFile(fileName) {
        let base = this.base ? path.join(this.dir, this.base) : this.dir
        let filePath = path.join(base, fileName);
        if(!fs.existsSync(filePath)) {
            throw new Error(`File ${fileName} does not exist`);
        }
        return await fs.promises.readFile(filePath, 'utf-8');
    }
}

const workdir = async (repo, dir, base, commit = undefined) => {
    if(!repo) {
        return reject('missing repository')
    }
    if(!dir) {
        return reject(`missing dir for ${repo}`)
    }
    const controller = new GitWorkDir(dir, repo, base);
    if(fs.existsSync(dir)) {
        return controller;
    }

    await controller.clone();
    let id = await controller.currentCommit();
    debug(`Current commit hash is ${id}`);
    if(commit != undefined && commit != id) {
        debug(`Start to checkout ${commit}`);
        await controller.checkout(commit);
    }
    return controller;
};

module.exports = {
    workdir
};