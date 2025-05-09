process.env.WORKDIR_PATH = 'workdirs-test'

const path = require('path')
const fs = require('fs')
const chai = require('chai')
const should = chai.should()
const git = require('../utils/storage/git')
const debug = require('debug')('coding:tests:git-util')

describe('Git Helper', function () {
    describe('Clone', function () {
        it('Check simple clone', function (done) {
            git.workdir("https://github.com/thi-coding-ars/example-tasks.git", path.join(process.env.WORKDIR_PATH, "tmp-" + new Date().getTime())).then(workdir => {
                if (!fs.existsSync(path.join(workdir.dir, "README.md"))) {
                    should.fail("README.md does not exist in loaded repo?");
                }
                done();
            }).catch(err => {
                should.fail("Errors are bad in this case: " + err);
                done();
            });
        });
        it('Check clone with commit hash', function (done) {
            git.workdir("https://github.com/thi-coding-ars/example-tasks.git", path.join(process.env.WORKDIR_PATH, "tmp-" + new Date().getTime()), undefined, "5f2fcfed1274ac9436f63dc5f524e4f331566e92").then(workdir => {
                if (!fs.existsSync(path.join(workdir.dir, "README.md"))) {
                    should.fail("README.md does not exist in loaded repo?");
                }
                workdir.currentCommit().then(hash => {
                    hash.should.be.eql("5f2fcfed1274ac9436f63dc5f524e4f331566e92")
                    done();
                }).catch(err => {
                    debug(err)
                    should.fail("Error while getting commit hash?");
                    done();
                });
            }).catch(err => {
                debug(err)
                should.fail("Errors are bad in this case: " + err);
                done();
            });
        });
    });

    after('Removing workdir folder', function (done) {
        fs.promises.rmdir(process.env.WORKDIR_PATH, { recursive: true }).then(() => {
            console.log('workdir removed!');
            done();
        });
    });
});
