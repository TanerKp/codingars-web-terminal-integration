process.env.NODE_ENV = 'test';
process.env.WORKDIR_PATH = 'workdirs-test'

const fs = require('fs');
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../app');
const should = chai.should();

chai.use(chaiHttp);

describe('Solution', () => {
    before('Check server is running', done => server.started ? done() : server.on( "started", () => done()));

    let id;
    let agent;
    beforeEach('Load details', function(done) {
        agent = chai.request.agent(server);
        agent
            .get('/github/thi-coding-ars/example-tasks.git')
            .send()
            .end((err, res) => {
                res.should.have.status(200);
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
    describe('/POST sources', () => {
        it('it run tasks by using runner backend', (done) => {
            let exampleSource = "public class Main { public static void main(String[] args) { System.out.println(\"xyz\"); } }";
            agent
                .post(`/run/${id}/0`)
                .send({
                    sources: [
                        {path: "Main.java", content: exampleSource}
                    ]
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('runOutput');
                    res.body.runOutput.should.have.eql('xyz\n');
                    agent
                        .get(`/task/${id}/0`)
                        .send()
                        .end((err, res) => {
                            res.should.have.status(200);
                            res.body.should.be.a('object');
                            res.body.should.have.property('sources').with.length(1);
                            res.body.sources[0].should.have.property('path');
                            res.body.sources[0].should.have.property('content');
                            res.body.sources[0].content.should.eql(exampleSource);
                            done();
                        })
                })
        });
    });
    describe('/POST solution', () => {
        it('it run python tasks and provide result', (done) => {
            let exampleSource = "print(\"Hello, World\")";
            agent
                .post(`/run/${id}/2`)
                .send({
                    sources: [
                        {path: "main.py", content: exampleSource}
                    ]
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('runOutput');
                    res.body.runOutput.should.have.eql('Hello, World\n');
                    agent
                        .get(`/solution/${id}/2`)
                        .send()
                        .end((err, res) => {
                            res.should.have.status(200);
                            res.body.should.be.a('array');
                            res.body.should.have.lengthOf(1);
                            res.body[0].should.have.property('sources').with.lengthOf(1);
                            res.body[0].sources[0].should.have.property('content');
                            res.body[0].sources[0].content.should.eql(exampleSource);
                            done();
                        })
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
