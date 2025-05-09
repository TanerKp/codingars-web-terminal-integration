const express = require('express');
const app = express();
const http = require("http");
const morgan = require('morgan');
const session = require('express-session')
const mongoose = require('mongoose');
const debug = require('debug')('coding:app');
require('dotenv').config();
const userSessions = require('./utils/session-store');
const setupCodeRunnerWebSocket = require("./websocket/code-runner");


const startApp = function() {
    const server = http.createServer(app);
    const MongoStore = require('connect-mongo')(session);

    app.set('trust proxy', function (ip) {
        return true;
    })
    
    /*
     * Config body parsing
     */
    const bodyParser = require('body-parser');
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    
    /*
     * Config body parsing
     */
    if (process.env.NODE_ENV !== 'test') {
        //use morgan to log at command line
        app.use(morgan('combined')); //'combined' outputs the Apache style LOGs
    }
    
    /*
     * Handle sessions
     */
    const sessionStore = new MongoStore({
        mongooseConnection: mongoose.connection,
      });
    app.use(session({
        secret: process.env.SECRET || 'SOMETHING VERY SECRET',
        resave: false, // mongo not ready for parallel requests?
        saveUninitialized: true,
        cookie: {
            secure: process.env.COOKIE_SECURE ? true : false,
            path: process.env.COOKIE_PATH || '/',
            sameSite: process.env.COOKIE_SAME_SITE || 'lax',
            maxAge: 60 * 60 * 24 * 1000,
            httpOnly: false
        },
        name: 'codingars.sid',
        store: sessionStore,
    }));
    
    /*
     * Config CORS for express
     */
    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", req.headers.origin);
        res.header("Access-Control-Allow-Methods", "OPTIONS, PUT, POST, DELETE, GET");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, X-Access-Token");
        res.header('Access-Control-Allow-Credentials', true);
        res.header("Access-Control-Expose-Headers", "Content-Type, X-Access-Token");
        //intercepts OPTIONS method
        if ("OPTIONS" === req.method) {
            //respond with 200
            res.sendStatus(200);
        } else {
            //move on
            next();
        }
    });
    
    /*
     * Create routes
     */
    app.use('/git/', require('./route/git'));
    app.use('/identify/', require('./route/identify'));
    app.use('/join/', require('./route/join'));
    app.use('/collection/', require('./route/collection'));
    app.use('/task/', require('./route/task'));
    app.use('/run/', require('./route/run'));
    app.use('/test/', require('./route/test'));
    app.use('/solution/', require('./route/solution'));
    app.use('/sample-solution/', require('./route/sample-solution'));
    app.use('/load/', require('./route/load'));
    app.use('/save/', require('./route/save'));
    app.use('/measurement/', require('./route/measurement'));
    app.use('/code-review/', require('./route/code-review'));

    /*
     * Storage modules
     */
    app.use('/github/', require('./route/storage/github'));
    app.use('/http/', require('./route/storage/http'));
    app.use('/direct/', require('./route/storage/direct'));

    app.get('/version', (req, res) => res.send({'version': '1.0.0'}));

    /*
     * WebSocket proxy for code-runner
     */
    setupCodeRunnerWebSocket(server, sessionStore, userSessions);
    
    /*
     * Finally we start the application.
     */
    const port = process.env.PORT || 4000;
    server.listen(port, function () {
        debug(`Listening on ${port}`);
        app.emit("started");
        app.started = true;
    });
};

/**
 * Reconnect to mongo, until db is available.
 */
const connectWithRetry = function () {
    const db = process.env.DATABASE || 'mongodb://localhost/codingars';
    debug(`Connect to ${db}`);
    return mongoose.connect(db, 
        { useNewUrlParser: true, useUnifiedTopology: true }, 
        function (err) {
            if (err) {
                debug('Failed to connect to mongo on startup - retrying in 5 sec', err);
                setTimeout(connectWithRetry, 5000);
            } else {
                debug(`Database ${db} connected`);
                startApp();
            }
        });
};

connectWithRetry();

module.exports = app;