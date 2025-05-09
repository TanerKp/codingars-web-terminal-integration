process.env.NODE_ENV = 'test';
process.env.WORKDIR_PATH = 'workdirs-test'

const fs = require('fs');
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../app');
const should = chai.should();

chai.use(chaiHttp);

describe('Tester', () => {
    before('Check server is running', done => server.started ? done() : server.on("started", () => done()));

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
            agent
                .post(`/test/${id}/1`)
                .send({
                    sources: [
                        { path: "Main.java", content: "public class Main { public static void main(String[] args) { System.out.println(\"Hello, World\"); } }" }
                    ]
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('testOutput');
                    res.body.testOutput.noOfErrors.should.eql(0);
                    done();
                })
        });
        it('it run tasks by using runner backend based on task name', (done) => {
            agent
                .post(`/test/${id}/task2`)
                .send({
                    sources: [
                        { path: "Main.java", content: "public class Main { public static void main(String[] args) { System.out.println(\"Hello, World\"); } }" }
                    ]
                })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('testOutput');
                    res.body.testOutput.noOfErrors.should.eql(0);
                    done();
                })
        });
    });

    after('Removing workdir folder', function(done) {
        fs.promises.rmdir(process.env.WORKDIR_PATH, { recursive: true }).then(() => {
            console.log('workdir removed!');
            done();
        });
    });
});