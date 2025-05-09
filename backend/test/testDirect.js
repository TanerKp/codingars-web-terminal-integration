process.env.NODE_ENV = 'test';
process.env.WORKDIR_PATH = 'workdirs-test'

const fs = require('fs');
const chai = require('chai');
const chaiHttp = require('chai-http');
const server = require('../app');
const should = chai.should();

chai.use(chaiHttp);

describe('Direct Collection Creation', () => {
    before('Check server is running', done => server.started ? done() : server.on( "started", () => done()));

    describe('Setup Session', () => {
        it('it should create session', async () => {
            let res = await chai.request(server)
                .post('/direct/')
                .send({
                    sources: [
                        {path: 'collection.yaml', content: 'tasks:\n  - task1'},
                        {path: 'task1/task.yaml', content: 'title: "Test"\ndescription: "Hello, World!"\nmainClass: Main\nmaxTimeInMs: 2000\nrunWith: java\nfiles:\n  - Main.java\n'},
                        {path: 'task1/Main.java', content: 'public class Main { public static void main(String[] args) { System.out.println(\"Hello, World\"); } }'}
                    ]
                });
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('session');
            res.body.should.have.property('collection');
        });
    });

    describe('Use Session', () => {
        let session;
        let collection;
        let agent;

        before('Prepare', async () => {
            agent = chai.request.agent(server);
            let res = await agent.post('/direct/').send({
                sources: [
                    {path: 'collection.yaml', content: 'tasks:\n  - task1'},
                    {path: 'task1/task.yaml', content: 'title: "Test"\ndescription: "Hello, World!"\nmainClass: Main\nmaxTimeInMs: 2000\nrunWith: java\nfiles:\n  - Main.java\n'},
                    {path: 'task1/Main.java', content: 'public class Main { public static void main(String[] args) { System.out.println(\"Hello, World\"); } }'}
                ]
            });
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('session');
            session = res.body.session;
            collection = res.body.collection;
        });

        it('it should get collection details', async () => {
            let res = await agent
                .get(`/join/${session}`)
                .send();
            res.should.have.status(200);
            id = res.body.id;
            res = await agent
                .get(`/collection/${id}`)
                .send();
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('tasks').with.lengthOf(1);
        });

        it('it should get task details', async () => {
            let res = await agent
                .get(`/join/${session}`)
                .send();
            res.should.have.status(200);
            id = res.body.id;
            res = await agent
                .get(`/task/${id}/task1`)
                .send();
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('title');
            res.body.should.have.property('description');
            res.body.should.have.property('files').with.lengthOf(1);
            res.body.files[0].should.have.property('path');
            res.body.files[0].path.should.eql("Main.java");
            res.body.files[0].content.should.eql('public class Main { public static void main(String[] args) { System.out.println(\"Hello, World\"); } }');
        });

        it('it should update task details', async () => {
            let res = await agent
                .put(`/direct/${collection}`)
                .send({
                    sources: [
                        {path: 'task1/task.yaml', content: 'title: "Test2"\ndescription: "Hello, World!"\nmainClass: Main\nmaxTimeInMs: 2000\nrunWith: java\nfiles:\n  - Main.java\n'}
                    ]
                });
            res.should.have.status(204);
            res = await agent
                .get(`/join/${session}`)
                .send();
            res.should.have.status(200);
            id = res.body.id;
            res = await agent
                .get(`/task/${id}/task1`)
                .send();
            res.should.have.status(200);
            res.body.should.be.a('object');
            res.body.should.have.property('title');
            res.body.title.should.eql('Test2');
        });
    });

    after('Removing workdir folder', function (done) {
        fs.promises.rmdir(process.env.WORKDIR_PATH, { recursive: true }).then(() => {
            console.log('workdir removed!');
            done();
        });
    });
});
