process.env.NODE_ENV = 'test';
process.env.WORKDIR_PATH = 'workdirs-test'

const fs = require('fs');
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../app');
const should = chai.should();

chai.use(chaiHttp);

describe('GitHub Collection Creation', () => {
    before('Check server is running', done => server.started ? done() : server.on( "started", () => done()));

    describe('/GET repository', () => {
        it('it should load github repo', (done) => {
            chai.request(server)
                .get('/github/thi-coding-ars/example-tasks.git')
                .send()
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.should.have.property('session');
                    res.body.should.have.property('collection');
                    done();
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
