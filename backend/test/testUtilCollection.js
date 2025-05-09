const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');
const server = require('../app');
const collection = require('../utils/collection')
const workdirs = require('../utils/workdirs')
const debug = require('debug')('coding:tests:util-collection')

describe('Util Collections', function () {
    before('Check server is running', done => server.started ? done() : server.on( "started", () => done()));

    describe('Test Load', function () {
        it('We should get details', function () {
            return new Promise((resolve, reject) => {
                let agent = chai.request.agent(server);
                agent
                    .get('/github/thi-coding-ars/example-tasks.git')
                    .send()
                    .end((err, res) => {
                        res.should.have.status(200);
                        workdirs.receive(res.body.collection).then(workdir => {
                            collection.details(workdir).then(data => {
                                data.should.be.a('Object');
                                data.should.have.property('tasks').with.lengthOf(3);
                                data.tasks[0].should.have.be.eql("task1");
                                resolve();
                            }).catch(err => reject(new Error(err)))
                        }).catch(err => reject(new Error(err)));
                    });
            });
        });
    });
});