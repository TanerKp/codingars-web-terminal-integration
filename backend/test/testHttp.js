process.env.NODE_ENV = 'test';
process.env.WORKDIR_PATH = 'workdirs-test'

const fs = require('fs');
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../app');
const should = chai.should();

chai.use(chaiHttp);

describe('HTTP Collection Creation', () => {
    before('Check server is running', done => server.started ? done() : server.on( "started", () => done()));

    describe('Setup Session', () => {
        it('it should create session', () => {
            return new Promise((resolve, reject) => {
                chai.request(server)
                    .post('/http/')
                    .send({
                        url: 'https://raw.githubusercontent.com/thi-coding-ars/example-tasks/main/'
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        res.body.should.have.property('session');
                        res.body.should.have.property('collection');
                        resolve();
                    })
            });
        });
    });

    describe('Use Session', () => {
        let session;
        let agent;
        before('Prepare', function () {
            return new Promise((resolve, reject) => {
                agent = chai.request.agent(server);
                agent.post('/http/')
                    .send({
                        url: 'https://raw.githubusercontent.com/thi-coding-ars/example-tasks/main/'
                    })
                    .end((err, res) => {
                        res.should.have.status(200);
                        res.body.should.be.a('object');
                        res.body.should.have.property('session');
                        session = res.body.session;
                        resolve();
                    })
            })
        });
        it('it should get collection details', () => {
            return new Promise((resolve, reject) => {
                agent
                    .get(`/join/${session}`)
                    .send()
                    .end((err, res) => {
                        res.should.have.status(200);
                        id = res.body.id;
                        agent
                            .get(`/collection/${id}`)
                            .send()
                            .end((err, res) => {
                                res.should.have.status(200);
                                res.body.should.be.a('object');
                                res.body.should.have.property('title');
                                res.body.should.have.property('description');
                                res.body.should.have.property('tasks').with.lengthOf(3);
                                resolve();
                            })
                    });
            })
        });
        it('it should get task details', () => {
            return new Promise((resolve, reject) => {
                agent
                    .get(`/join/${session}`)
                    .send()
                    .end((err, res) => {
                        res.should.have.status(200);
                        id = res.body.id;
                        agent
                            .get(`/task/${id}/task1`)
                            .send()
                            .end((err, res) => {
                                res.should.have.status(200);
                                res.body.should.be.a('object');
                                res.body.should.have.property('title');
                                res.body.should.have.property('description');
                                res.body.should.have.property('files').with.lengthOf(1);
                                res.body.files[0].should.have.property('path');
                                res.body.files[0].path.should.eql("Main.java");
                                res.body.files[0].content.should.eql('public class Main {\n' +
                                '  public static void main(String[] args) {\n' +
                                '    \n' +
                                '  }\n' +
                                '}');
                                resolve();
                            })
                    });
            })
        });
    });

    after('Removing workdir folder', function (done) {
        fs.promises.rmdir(process.env.WORKDIR_PATH, { recursive: true }).then(() => {
            console.log('workdir removed!');
            done();
        });
    });
});
