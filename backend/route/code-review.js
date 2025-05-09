const express = require('express')
const router = express.Router();
const reviewCode = require('../utils/code-review');
const debug = require('debug')('coding:routes:code-review');
const workdirs = require('../utils/workdirs');
const collection = require('../utils/collection');
const task = require('../utils/task');
const loadTaskSolution = require('./helper/loadSolution');
const reviewService = require('../services/review');
const filesHash = require('../utils/hash-from-files');
const config = require('../config');
const callbacks = require('./helper/callback');
const crypto = require('crypto');
const { minScoreRatio } = require('./helper/code-review');


const getPrompts = (req) => {
    return config.get("prompts-" + (req.query.language || "de"), {});
};

const createAccessDetails = (userRef, accessId) => {
    if (!userRef || !accessId) {
        throw new Error('Beide Parameter müssen angegeben werden');
    }

    const hashedUserRef = crypto.createHash('sha256')
        .update(userRef + "::" + accessId)
        .digest('hex');

    const partialHashedUserRef = hashedUserRef.substring(0, 16);

    return `${partialHashedUserRef},${accessId}`;
};

const validateAccessDetails = (userRef, accessId, signature) => {
    if (!userRef || !accessId || !signature) {
        return false;
    }

    try {
        const accessString = createAccessDetails(userRef, accessId);

        const expectedSignature = crypto.createHash('sha256')
            .update(accessString)
            .digest('hex');

        return signature === expectedSignature;
    } catch (error) {
        console.error('Error while validating the signature:', error);
        return false;
    }
};

// Example for how to create a signature
// const testCreateSignature = (partialHashedUserRef, accessId) => {
//     try {
//         const accessString = `${partialHashedUserRef},${accessId}`;

//         const signature = crypto.createHash('sha256')
//             .update(accessString)
//             .digest('hex');

//         return signature;
//     } catch (error) {
//         console.error('Error while validating the signature:', error);
//         return false;
//     }
// };

const sseMiddleware = (req, res, next) => {
    debug('Init SSE for Code-Review');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    // Halte die Verbindung am Leben
    const keepAlive = setInterval(() => {
        if (!res.finished) {
            res.write('\n');
        }
    }, 15000);

    // Cleanup bei Verbindungsabbruch
    res.on('close', () => {
        clearInterval(keepAlive);
    });

    next();
};

const handleSse = async (generator, res) => {
    const stream = await generator.generate();
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    let result = '';
    reading: while (true) {
        const { done, value } = await reader.read();

        if (done) {
            break;
        }

        // Decodiere den Chunk und sende ihn als SSE
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter(line => line.trim());
        for (const line of lines) {
            if (line.startsWith("data:")) {
                const jsonData = line.replace(/^data: /, '');
                if (jsonData === "[DONE]") break reading;

                try {
                    const token = generator.extractMessages(jsonData);
                    result += token;
                    res.write(`data: ${JSON.stringify({ token: token })}\n\n`);
                } catch (error) {
                    if (error.isStreamError) {
                        console.error(error.message);
                        res.write(`data: ${JSON.stringify({
                            error: true,
                            type: error.errorData?.type,
                            message: error.errorData?.message
                        })}\n\n`);
                        break reading;
                    }
                }
            }
        }
    }
    return result;
};

const extractScore = require('../utils/extract-score');

router.post('/bad-review/:id/:ref', async (req, res) => {
    try {
        // Get collection id
        const sessionCid = req.params.id;
        if (!sessionCid) {
            res.json({ token: 'Missing joining id' });
            return;
        }

        // Get review reference to continue this code review
        const ref = req.params.ref;
        if (!ref) {
            res.json({ token: 'Missing ref' });
            return;
        }

        // Get review reference to continue this code review
        const message = req.body.message;
        if (!message) {
            res.json({ token: 'Missing message for further discussion' });
            return;
        }

        const reviewData = await reviewService.get(ref);
        if (!reviewData) {
            res.json({ token: 'Missing review data for ' });
            return;
        }

        const userRef = ((req.session.joined || {})[sessionCid] || {}).userRef;
        if (reviewData.userRef !== userRef) {
            res.json({ token: 'Missing review data for ' + ref });
            return;
        }

        const context = req.query.context ? req.query.context + ':' : '';

        // Combine original messages with new messages
        reviewData.messages.push({ role: 'user', content: "User selected this is a bad review, reason: " + message });
        await reviewService.update(ref, reviewData.messages);

        const base64Message = Buffer.from(message || "no message").toString('base64');
        callbacks.log('coding-ars-bad-review', context + reviewData.taskRef, `${createAccessDetails(userRef, reviewData.accessId)},${base64Message}`,
            ((req.session.joined || {})[sessionCid] || {}).callback,
            ((req.session.joined || {})[sessionCid] || {}).contentId);

        // Close connection
        res.json({ ref: ref })
    } catch (error) {
        debug('Fehler beim Code-Review: %O', error);
        res.json({ token: 'Internal server error' });
    }
});

router.post('/continue/:id/:ref', sseMiddleware, async (req, res) => {
    try {
        // Get collection id
        const sessionCid = req.params.id;
        if (!sessionCid) {
            res.write(`data: ${JSON.stringify({ token: 'Missing joining id' })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
        }

        // Get review reference to continue this code review
        const ref = req.params.ref;
        if (!ref) {
            res.write(`data: ${JSON.stringify({ token: 'Missing ref' })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
        }

        // Get review reference to continue this code review
        const message = req.body.message;
        if (!message) {
            res.write(`data: ${JSON.stringify({ token: 'Missing message for further discussion' })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
        }

        const reviewData = await reviewService.get(ref);
        if (!reviewData) {
            res.write(`data: ${JSON.stringify({ token: 'Missing review data for ' })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
        }

        const userRef = ((req.session.joined || {})[sessionCid] || {}).userRef;
        if (reviewData.userRef !== userRef) {
            res.write(`data: ${JSON.stringify({ token: 'Missing review data for ' + ref })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
        }

        const prompts = getPrompts(req);
        const prefix = prompts[reviewData.success ? 'success-prompt-prefix-following' : 'failed-prompt-prefix-following'] || '';

        const generator = reviewCode(reviewData.taskDescription, reviewData.sources, reviewData.samples);
        generator.restoreMessages(reviewData.messages.map(el => ({ role: el.role, content: el.content })));
        const internalUserMessage = prefix + message;
        generator.attachMessageAsUser(internalUserMessage);

        const result = await handleSse(generator, res);

        // Finally attach message to generator
        generator.attachMessageAsAssistant(result);

        // Combine original messages with new messages
        const updatedMessages = [...reviewData.messages, ...generator.getMessages().slice(reviewData.messages.length).map(el => {
            if (el.content === internalUserMessage) {
                return { role: el.role, content: el.content, original: message };
            } else if (el.role === 'assistant') {
                return { role: el.role, content: el.content };
            }
            return { role: el.role, content: el.content, hide: true }; // Hide any other message
        })];
        await reviewService.update(ref, updatedMessages);

        // Close connection
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        debug('Fehler beim Code-Review: %O', error);
        res.write(`data: ${JSON.stringify({ token: 'Internal server error' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    }
});

router.get('/details/:access', async (req, res) => {
    try {
        const accessId = req.params.access;
        if (!accessId) {
            res.json({ error: 'Missing access id' });
            return;
        }

        const sig = req.query.sig;
        if (!sig) {
            res.json({ error: 'Missing signature' });
            return;
        }

        const reviewData = await reviewService.getByAccess(accessId);
        if (!reviewData) {
            res.json({ error: 'Missing review data for ' + accessId });
            return;
        }

        const userRef = reviewData.userRef;
        if (!validateAccessDetails(userRef, accessId, sig)) {
            res.json({ error: 'Invalid access details' });
            return;
        }

        res.json({
            ref: reviewData._id.toString(),
            task: reviewData.taskRef,
            reviewStarted: reviewData.reviewStarted,
            lastModification: reviewData.lastModification,
            success: reviewData.success,
            sources: reviewData.sources,
            messages: reviewData.messages.map(el => {
                return {
                    role: el.role,
                    content: el.content
                }
            })
        });
    } catch (error) {
        debug('Error while loading review: %O', error);
        res.json({ error: 'Internal server error' });
    }
});

router.get('/load/:id/*', async (req, res) => {
    try {
        const sessionCid = req.params.id;
        if (!sessionCid) {
            res.json({ error: 'Missing joining id' });
            return;
        }

        const cid = ((req.session.joined || {})[sessionCid] || {}).collection;
        if (!cid) {
            debug(`Requesting details for collection with ref ${sessionCid} but could not find reference in client session`);
            res.json({ token: 'Unknown joining id' });
            return;
        }

        debug(`Access details for task in order to run ${sessionCid} > ${cid}`);

        const path = req.path;
        const nr = path.substr(sessionCid.length + 7); // +7 for /load/<id>/
        const workdir = await workdirs.receive(cid);
        const details = await collection.details(workdir);
        const taskPath = collection.taskPath(details, nr);
        const userRef = ((req.session.joined || {})[sessionCid] || {}).userRef;

        const reviewData = await reviewService.getLatest(userRef, cid, taskPath);
        if (!reviewData) {
            res.json({ error: 'Missing review data for ' + taskPath });
            return;
        }

        if (reviewData.userRef !== userRef) {
            res.json({ error: 'Missing review data for ' + taskPath });
            return;
        }

        let score;
        for (const message of reviewData.messages) {
            if (message.role === 'assistant') {
                score = extractScore(message.content);
                if (score) {
                    break;
                }
            }
        }

        res.json({
            messages: reviewData.messages.filter(el => el.hide !== true).map(el => {
                return {
                    role: el.role,
                    content: el.original || el.content
                }
            }),
            success: reviewData.success,
            score: score,
            minScore: minScoreRatio(await task.details(workdir, taskPath))
        });
    } catch (error) {
        debug('Error while loading review: %O', error);
        res.json({ error: 'Internal server error' });
    }
});

router.post('/no-review/:id/*', async (req, res) => {
    try {
        const sessionCid = req.params.id;
        if (!sessionCid) {
            res.json({ token: 'Missing joining id' });
            return;
        }

        const cid = ((req.session.joined || {})[sessionCid] || {}).collection;
        if (!cid) {
            debug(`Requesting details for collection with ref ${sessionCid} but could not find reference in client session`);
            res.json({ token: 'Unknown joining id' });
            return;
        }

        const userRef = ((req.session.joined || {})[sessionCid] || {}).userRef;
        const { sources } = req.body;

        if (!sources || !sources.length) {
            debug(`Nothing to execute for collection ${cid}`);
            res.json({ token: 'Missing code parameter' });
            return;
        }

        debug(`Access details for task in order to run ${sessionCid} > ${cid}`);

        const path = req.path;
        const nr = path.substr(sessionCid.length + 12); // +12 for /no-review/<id>/
        const workdir = await workdirs.receive(cid);
        const details = await collection.details(workdir);
        const taskPath = collection.taskPath(details, nr);
        const context = req.query.context ? req.query.context + ':' : '';

        const fh = filesHash(sources);
        req.session.results = req.session.results || {};
        req.session.results[sessionCid] = req.session.results[sessionCid] || {};
        debug("Ask for current solution state ", fh, req.session.results[sessionCid][fh]);
        const success = !!(req.session.results[sessionCid][fh] || {}).success;

        if (!taskPath) {
            debug(`Task ${nr} does not exist in collection ${cid}`);
            res.json({ token: 'Task does not exist' });
            return;
        }

        if (!success) {
            debug(`Task ${nr} not successfull finished`);
            res.json({ token: 'Task not finished jet' });
            return;
        }

        const taskDetails = await task.details(workdir, taskPath);

        if (taskDetails.useCodeReview !== true) {
            debug('Code-Review not enabled for', taskPath);
            res.json({ token: 'Code-Review not enabled for this task' });
            return;
        }

        debug('Start No-Code-Review for', taskPath);

        const samples = await task.sampleSolutionFiles(workdir, taskPath);

        // Save review data
        const reviewData = await reviewService.create(
            sources,
            samples,
            userRef,
            req.body.customRef || req.session.customRef,
            cid,
            taskPath,
            success,
            "User selected no code review",
            [{ "role": "user", "content": "No-Code-Review" }]
        );

        try {
            const msg = createLogMessage(null, taskDetails, userRef, reviewData.accessId, 'no-code-review');
            callbacks.log('coding-ars-review', context + taskPath, msg,
                ((req.session.joined || {})[sessionCid] || {}).callback,
                ((req.session.joined || {})[sessionCid] || {}).contentId);
        } catch (err) {
            debug('Could not log review result event: %O', err);
        }

        res.json({ ref: reviewData._id.toString(), success: success, score: { a: NaN, b: NaN, ratio: NaN }, noCodeReview: true });
    } catch (error) {
        debug('Error while No-Code-Review: %O', error);
        res.json({ error: 'Internal server error' });
    }
});


const createLogMessage = (score, taskDetails, userRef, accessId, additional = "") => {
    const minScoreValue = minScoreRatio(taskDetails);
    const accessDetails = createAccessDetails(userRef, accessId);
    if (score) {
        return `${score.a},${score.b},${score.ratio},${minScoreValue},${accessDetails}${additional ? ',' + additional : ''}`;
    } else {
        return `NaN,NaN,NaN,${minScoreValue},${accessDetails}${additional ? ',' + additional : ''}`;
    }
};

router.post('/init/:id/*', sseMiddleware, async (req, res) => {
    try {
        const sessionCid = req.params.id;
        if (!sessionCid) {
            res.write(`data: ${JSON.stringify({ token: 'Missing joining id' })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
        }

        const cid = ((req.session.joined || {})[sessionCid] || {}).collection;
        if (!cid) {
            debug(`Requesting details for collection with ref ${sessionCid} but could not find reference in client session`);
            res.write(`data: ${JSON.stringify({ token: 'Unknown joining id' })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
        }

        const userRef = ((req.session.joined || {})[sessionCid] || {}).userRef;
        const { sources } = req.body;

        if (!sources || !sources.length) {
            debug(`Nothing to execute for collection ${cid}`);
            res.write(`data: ${JSON.stringify({ token: 'Missing code parameter' })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
        }

        debug(`Access details for task in order to run ${sessionCid} > ${cid}`);

        const path = req.path;
        const nr = path.substr(sessionCid.length + 7); // +7 for /init/<id>/
        const workdir = await workdirs.receive(cid);
        const details = await collection.details(workdir);
        const taskPath = collection.taskPath(details, nr);
        const context = req.query.context ? req.query.context + ':' : '';

        const fh = filesHash(sources);
        req.session.results = req.session.results || {};
        req.session.results[sessionCid] = req.session.results[sessionCid] || {};
        debug("Ask for current solution state ", fh, req.session.results[sessionCid][fh]);
        const success = !!(req.session.results[sessionCid][fh] || {}).success;

        if (!taskPath) {
            debug(`Task ${nr} does not exist in collection ${cid}`);
            res.write(`data: ${JSON.stringify({ token: 'Task does not exist' })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
        }

        const taskDetails = await task.details(workdir, taskPath);

        if (taskDetails.useCodeReview !== true) {
            debug('Code-Review not enabled for', taskPath);
            res.write(`data: ${JSON.stringify({ token: 'Code-Review not enabled for this task' })}\n\n`);
            res.write(`data: [DONE]\n\n`);
            res.end();
            return;
        }

        debug('Start Code-Review for', taskPath);

        const samples = await task.sampleSolutionFiles(workdir, taskPath);
        const prompts = getPrompts(req);
        const systemPrompt = prompts[success ? 'success-system-prompt' : 'failed-system-prompt'] || '';
        const promptPrefix = prompts[success ? 'success-prompt-prefix' : 'failed-prompt-prefix'] || '';
        const notePrefix = prompts['note-prefix'] || '';
        const generator = reviewCode(
            taskDetails.description,
            sources,
            samples,
            systemPrompt,
            promptPrefix,
            taskDetails.note ? notePrefix + " " + taskDetails.note.trim() : "",
            !success ? req.query.message || "" : "");

        const result = await handleSse(generator, res);

        if(!result) {
            debug('Missing result from generator for Task', taskPath, 'with api config', generator.getApiDetails());
        }

        // use this to test what happens in client with errors
        // const result = "";
        // res.write(`data: ${JSON.stringify({ error: true, message:"something..." })}\n\n`);

        // Finally attach message to generator
        generator.attachMessageAsAssistant(result);

        // Routine to handle missing scores as fallback, if result does not contain a score
        let score = extractScore(result);
        if (!score && success) {
            debug('Could not extract score from result for ' + userRef + ' in ' + taskPath);
            const missingScorePrompt = prompts['success-missing-score-prompt'] || '';
            if(missingScorePrompt) {
                generator.attachMessageAsUser(missingScorePrompt);
                res.write(`data: ${JSON.stringify({ token: "\n\n" })}\n\n`);
                const missingScoreResult = await handleSse(generator, res);
                generator.attachMessageAsAssistant(missingScoreResult);
                score = extractScore(missingScoreResult);
                if (!score) {
                    debug('Could not extract score from result for ' + userRef + ' in ' + taskPath + ' again');
                }
            } else {
                debug('Couldn\'t ask again for score for ' + userRef + ' in ' + taskPath + ', there is no fallback prompt configured (success-missing-score-prompt)');
            }
        }

        // So far, we only want to publish the assistant answer, any
        // user or system messages should be kept in private
        let messages = generator.getMessages().map(element => {
            return {
                role: element.role,
                content: element.content,
                hide: element.role !== 'assistant'
            };
        });

        // Save review data
        const reviewData = await reviewService.create(
            sources,
            samples,
            userRef,
            req.body.customRef || req.session.customRef,
            cid,
            taskPath,
            success,
            generator.getSystemPrompt(),
            messages
        );

        try {
            if(success) {
                const msg = createLogMessage(score, taskDetails, userRef, reviewData.accessId);
                callbacks.log('coding-ars-review', context + taskPath, msg,
                    ((req.session.joined || {})[sessionCid] || {}).callback,
                    ((req.session.joined || {})[sessionCid] || {}).contentId);
            }
        } catch (err) {
            debug('Could not log review result event: %O', err);
        }

        // send review to client for further requests related to this session
        res.write(`data: ${JSON.stringify({ ref: reviewData._id.toString(), score: score, minScore: minScoreRatio(taskDetails), success: success })}\n\n`);

        // Close connection
        res.write('data: [DONE]\n\n');
        res.end();
    } catch (error) {
        debug('Fehler beim Code-Review: %O', error);
        res.write(`data: ${JSON.stringify({ token: 'Interner Server-Fehler' })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
    }
});

module.exports = router;