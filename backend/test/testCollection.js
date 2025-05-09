process.env.NODE_ENV = 'test';
process.env.WORKDIR_PATH = 'workdirs-test'

const fs = require('fs');
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../app');
const should = chai.should();

chai.use(chaiHttp);

describe('Collection', () => {
    before('Check server is running', done => server.started ? done() : server.on( "started", () => done()));

    let id;
    let cid;
    let collectionSessionId;
    let agent;
    beforeEach('Load details', function(done) {
        agent = chai.request.agent(server);
        agent
            .get('/github/thi-coding-ars/example-tasks.git')
            .send()
            .end((err, res) => {
                res.should.have.status(200);
                cid = res.body.collection;
                agent
                    .get(`/join/${res.body.session}`)
                    .send()
                    .end((err, res) => {
                        res.should.have.status(200);
                        id = res.body.id;
                        agent
                            .post(`/join/admin`)
                            .send({
                                collection: cid
                            })
                            .end((err, res) => {
                                res.should.have.status(200);
                                collectionSessionId = res.body.id;
                                done();
                            });
                    });
            });
    })

    describe('/GET details', () => {
        it('it should load details for collection', (done) => {
            agent
                .get(`/collection/${id}`)
                .send()
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('title');
                    res.body.should.have.property('description');
                    res.body.should.have.property('tasks').with.lengthOf(3);
                    done();
                })
        })
    })

    describe('/GET create another session', () => {
        it('it should create a new session id', (done) => {
            agent
                .get(`/collection/${collectionSessionId}/create-session`)
                .send()
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('session');
                    res.body.session.should.not.eql(id);
                    done();
                })
        })
    })

    after('Removing workdir folder', function (done) {
        fs.promises.rmdir(process.env.WORKDIR_PATH, { recursive: true }).then(() => {
            console.log('workdir removed!');
            done();
        });
    });
});
