const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const { expect } = chai;
const server = require('../app');
const config = require('../config');
const debug = require('debug')('coding:test:code-review');
const should = chai.should();

chai.use(chaiHttp);

describe('Code Review', () => {
    before('Check server is running', done => 
        server.started ? done() : server.on("started", () => done())
    );

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

    // Mock für die Anthropic API Response
    const mockStream = async function* () {
        yield new TextEncoder().encode("data: " + JSON.stringify({
            delta: { text: 'Analyzing code...' }
        }));
        yield new TextEncoder().encode("data: " + JSON.stringify({
            delta: { text: 'Code quality: Good' }
        }));
        yield new TextEncoder().encode("data: " + JSON.stringify({
            delta: { text: 'Score: 8/10' }
        }));
        yield new TextEncoder().encode("data: [DONE]");
    };

    const mockResponse = {
        ok: true,
        body: {
            getReader: () => ({
                read: (() => {
                    const iterator = mockStream();
                    return async () => {
                        const next = await iterator.next();
                        return {
                            done: next.done,
                            value: next.value
                        };
                    };
                })()
            })
        }
    };

    let fetchStub;

    beforeEach(() => {
        // Mock der fetch Funktion
        fetchStub = sinon.stub(global, 'fetch').resolves(mockResponse);
        
        // Stelle sicher, dass die Konfiguration geladen ist
        config.set('llm.type', 'claude');
        config.set('llm.api-key', 'test-key');
        config.set('llm.model', 'claude-3-5-sonnet-20241022');
        config.set('llm.system-prompt', 'Du bist ein Code-Reviewer. Die Aufgabe ist: {{task}}');
        config.set('llm.prompt-prefix', 'Bitte analysiere den Code: {{code}}');
    });

    afterEach(() => {
        fetchStub.restore();
    });

    describe('/POST review-code', () => {

        it('should accept requests', (done) => {
            debug('Starting basic test');
            
            agent.post(`/code-review/${id}/task1`)
                .send({ 
                    sources: [{path: "Main.java", content: 'console.log("test")'}]
                })
                .end((err, res) => {
                    debug('Response received:', err ? 'error' : 'success');
                    debug('Error:', err);
                    debug('Response:', res ? res.status : 'no response');
                    done(err);
                });
        });
        
        it('should stream code review results', (done) => {
            debug('Starting streaming test');

            const testData = {
                sources: [{path: "Main.java", content: `
                    function factorial(n) {
                        if (n <= 1) return 1;
                        return n * factorial(n - 1);
                    }
                `}]
            };

            let messageCount = 0;
            const expectedMessages = 3;
            let testCompleted = false;
            
            const finishTest = () => {
                if (!testCompleted) {
                    testCompleted = true;
                    debug('Test complete - calling done()');
                    done();
                } else {
                    debug('Test already completed - ignoring additional done() call');
                }
            };

            const req = agent.post(`/code-review/${id}/task1`)
                .send(testData);

            req.then(res => {
                debug('Stream connection established');
                
                const events = res.text.split('\n\n').filter(Boolean);
                debug('Received events:', events.length);
                
                events.forEach(event => {
                    if (event.startsWith('data: ')) {
                        const eventData = event.replace('data: ', '');
                        debug('Raw event data:', eventData);

                        if (eventData === '[DONE]') {
                            debug('Received DONE signal');
                            if (messageCount >= expectedMessages) {
                                debug('Test complete with expected messages');
                                finishTest();
                            }
                            return;
                        }

                        try {
                            const data = JSON.parse(eventData);
                            debug('Processed event:', data);
                            
                            if (data.token) {
                                messageCount++;
                                debug('Message count:', messageCount);
                                
                                if (messageCount >= expectedMessages) {
                                    debug('Test complete with all messages');
                                    finishTest();
                                }
                            }
                        } catch (e) {
                            debug('Error parsing event data:', e);
                            debug('Raw event that caused error:', eventData);
                        }
                    }
                });
            }).catch(err => {
                debug('Stream error:', err);
                done(err);
            });
        });

        it('should handle missing code parameter', (done) => {
            agent.post(`/code-review/${id}/task1`)
                .send({ })
                .end((err, res) => {
                    res.text.split('\n\n').forEach(line => {
                        const txt = line.replace('data: ', '').trim();
                        if(txt && txt != "[DONE]") {
                            debug(txt);
                            const data = JSON.parse(txt);
                            expect(data).to.have.property('token');
                            expect(data.token).to.equal('Missing code parameter');
                            done();
                        }
                    });
                });
        });

        it('should handle API errors gracefully', (done) => {
            // Überschreibe den fetch-Stub für diesen Test
            fetchStub.restore();
            fetchStub = sinon.stub(global, 'fetch').rejects(new Error('API Error'));

            agent.post(`/code-review/${id}/task1`)
                .send({
                    sources: [{path: "Main.java", content: 'function test() {}'}]
                })
                .end((err, res) => {
                    const data = JSON.parse(res.text.replace('data: ', ''));
                    expect(data).to.have.property('error');
                    expect(data.error).to.equal('Interner Server-Fehler');
                    done();
                });
        });
    });
});