const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');
const server = require('../app');
const chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

const debug = require('debug')('coding:tests:util-task')
const workdirs = require('../utils/workdirs')

const collection = require('../utils/collection')
const task = require('../utils/task')

describe('Task', function() {
    before('Check server is running', done => server.started ? done() : server.on("started", () => done()));

    describe('Test Load', function() {
        it('We should get details', function() {
            return new Promise((resolve, reject) => {
                agent = chai.request.agent(server);
                agent
                    .get('/github/thi-coding-ars/example-tasks.git')
                    .send()
                    .end((err, res) => {
                        res.should.have.status(200);
                        workdirs.receive(res.body.collection).then(workdir => {
                            collection.details(workdir).then(data => {
                                task.details(workdir, data.tasks[0]).then(data => {
                                    data.should.have.property('title');
                                    data.should.have.property('description');
                                    data.title.should.eql('Test');
                                    data.description.should.eql('Hello, World!');
                                    resolve();
                                }).catch(err => reject(new Error(err)))
                            }).catch(err => reject(new Error(err)))
                        });
                    });
            });
        });
        it('We should get details in same folder used as collection', function() {
            return new Promise((resolve, reject) => {
                let agent = chai.request.agent(server);
                agent
                    .get('/github/thi-coding-ars/example-tasks.git?base=task1')
                    .send()
                    .end((err, res) => {
                        res.should.have.status(200);
                        workdirs.receive(res.body.collection).then(workdir => {
                            collection.details(workdir).then(data => {
                                data.tasks[0].should.eql('.');
                                task.details(workdir, data.tasks[0]).then(data => {
                                    data.should.have.property('title');
                                    data.should.have.property('description');
                                    data.description.should.eql('Hello, World!');
                                    resolve();
                                }).catch(err => reject(new Error(err)))
                            }).catch(err => reject(new Error(err)))
                        });
                    });
            })
        });
    });
});