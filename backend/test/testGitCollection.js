process.env.NODE_ENV = 'test';
process.env.WORKDIR_PATH = 'workdirs-test'

const fs = require('fs');
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../app');
const should = chai.should();

chai.use(chaiHttp);

describe('Git Collection', () => {
    before('Check server is running', done => server.started ? done() : server.on("started", () => done()));

    let id;
    let cid;
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
                        done();
                    });
            });
    })

    describe('/GET update to commit', () => {
        it('it should update to specific commit', (done) => {
            agent
                .get(`/git/${cid}/commit/5932e3d3141d499474428149695241e7661bec06`)
                .send()
                .end((err, res) => {
                    res.should.have.status(204);
                    done();
                })
        })
        it('it should update to specific commit and clear cache', (done) => {
            agent
                .get(`/collection/${id}`)
                .send()
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('title');
                    res.body.should.have.property('description');
                    res.body.should.have.property('tasks').with.lengthOf(3);
                    agent
                        .get(`/git/${cid}/commit/5932e3d3141d499474428149695241e7661bec06`)
                        .send()
                        .end((err, res) => {
                            res.should.have.status(204);
                            agent
                                .get(`/collection/${id}`)
                                .send()
                                .end((err, res) => {
                                    res.should.have.status(200);
                                    res.body.should.be.a('object');
                                    res.body.should.have.property('title');
                                    res.body.should.have.property('description');
                                    res.body.should.have.property('tasks').with.lengthOf(1);
                                    done();
                                })
                        })
                })
        })
    })

    after('Removing workdir folder', function(done) {
        fs.promises.rmdir(process.env.WORKDIR_PATH, { recursive: true }).then(() => {
            console.log('workdir removed!');
            done();
        });
    });
});