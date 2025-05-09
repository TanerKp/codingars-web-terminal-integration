import callback from "../../../backend/route/helper/callback";

class CodingArsError {
    constructor(status, msg, url) {
        this.status = status;
        this.msg = msg;
        this.url = url;
    }
    toString() {
        return `Error while calling ${this.url}${this.msg ? ':' + this.msg : ''}`;
    }
}

const getUrl = (url, path) => url + (url.endsWith('/') ? '' : '/') + path

const get = function (url, path) {
    return new Promise((resolve, reject) => {
        const xhttp = new XMLHttpRequest();
        let fullUrl = getUrl(url, path);
        xhttp.open("GET", fullUrl, true);
        xhttp.withCredentials = true;
        xhttp.addEventListener("readystatechange", () => {
            if (xhttp.readyState == 4) {
                if (xhttp.status == 200) {
                    resolve(JSON.parse(xhttp.responseText));
                } else if (xhttp.status == 204) {
                    resolve();
                } else {
                    let data = "";
                    try {
                        data = JSON.parse(xhttp.responseText);
                    } catch (e) {
                        data = xhttp.responseText;
                    }
                    reject(new CodingArsError(xhttp.status, data.msg ? data.msg : data, fullUrl))
                }
            }
        })
        xhttp.send();
    })
}

const post = function (url, path, body) {
    return new Promise((resolve, reject) => {
        const xhttp = new XMLHttpRequest();
        let fullUrl = getUrl(url, path);
        xhttp.open("POST", fullUrl, true);
        xhttp.withCredentials = true;
        xhttp.addEventListener("readystatechange", () => {
            if (xhttp.readyState == 4) {
                if (xhttp.status == 200) {
                    resolve(JSON.parse(xhttp.responseText));
                } else if (xhttp.status == 204) {
                    resolve();
                } else {
                    let data = "";
                    try {
                        data = JSON.parse(xhttp.responseText);
                    } catch (e) {
                        data = xhttp.responseText;
                    }
                    reject(new CodingArsError(xhttp.status, data.msg ? data.msg : data), fullUrl)
                }
            }
        })

        xhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
        xhttp.send(JSON.stringify(body));
    })
}

async function postWithSse(url, path, body, callback) {
    try {
        let fullUrl = getUrl(url, path);
        const response = await fetch(fullUrl, {
            credentials: 'include',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            body: JSON.stringify(body)
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let buffer = "";
        while (true) {
            const {value, done} = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value);
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Unvollständige Zeile für nächsten Chunk aufheben
    
            for (const line of lines) {
                if (line.trim() === '') continue;
                if (line.trim() === 'data: [DONE]') {
                    callback({done: true});
                    return;
                }
                if (line.startsWith('data: ')) {
                    try {
                        const jsonData = JSON.parse(line.slice(6)); // "data: " entfernen
                        callback(jsonData);
                    } catch (e) {
                        console.error('Error parsing JSON:', line, e);
                    }
                }
            }
        }
    } catch (error) {
        console.error('SSE Error:', error);
    }
}

/**
 * Session buffer in active clients (on webpage might have 
 * multiple running sessions)
 */
const sessions = {};

export class CodingArsService {
    constructor(url, context) {
        this.url = url;
        this.context = context;
    }
    join (key) {
        return get(this.url, "join/" + key).then(data => new Promise(resolve => {
            this.collectionRef = data.id;
            resolve(self.collectionRef);
        }));
    }
    reJoin (id) {
        this.collectionRef = id;
        return new Promise(resolve => {
            resolve(id);
        });
    }
    task (task) {
        return get(this.url, "task/" + this.collectionRef + "/" + task)
    }
    loadUrl (task) {
        return getUrl(this.url, "load/" + this.collectionRef + "/" + task)
    }
    sampleSolution (task) {
        return get(this.url, "sample-solution/" + this.collectionRef + "/" + task)
    }
    collection () {
        return get(this.url, "collection/" + this.collectionRef)
    }
    run (task, sources) {
        return post(this.url, "run/" + this.collectionRef + "/" + task + "?context=" + encodeURIComponent(this.context), { sources })
    }
    save (task, sources) {
        return post(this.url, "save/" + this.collectionRef + "/" + task, { sources })
    }
    test (task, sources) {
        return post(this.url, "test/" + this.collectionRef + "/" + task + "?context=" + encodeURIComponent(this.context), { sources })
    }
    listSolutions (task) {
        return get(this.url, "solution/" + this.collectionRef + "/" + task)
    }
    thumbToggle (solution) {
        return get(this.url, "solution/" + this.collectionRef + "/thumb-toggle/" + solution)
    }
    identify (token) {
        return post(this.url, "identify/" + this.collectionRef, {token})
    }

    /**
     * If user does not wish to use code review, this method can be used. This one stores
     * a information with current result and a marker, that they dont want to use code review.
     * 
     * @param {*} language language this client runs currently, like de or en
     * @param {*} task current task id, like "task1"
     * @param {*} sources array of sources as used in other api methods
     * @returns promise with result of no code review
     */
    noCodeReview(language, task, sources) {
        return post(this.url, "code-review/no-review/" + this.collectionRef + "/" + task + "?context=" + encodeURIComponent(this.context) + "&language=" + language, {sources});
    }

    /**
     * If user selects a review as bad, this method can be used. This one stores
     * a information with into the chat and adds a log message.
     * 
     * @param {*} language language this client runs currently, like de or en
     * @param {*} task current task id, like "task1"
     * @param {*} sources array of sources as used in other api methods
     * @returns promise with result of no code review
     */
    badCodeReview(language, ref, message) {
        return post(this.url, "code-review/bad-review/" + this.collectionRef + "/" + ref + "?context=" + encodeURIComponent(this.context) + "&language=" + language, {message});
    }

    /**
     * Start SSE based code review with current sources
     * 
     * @param {*} language language this client runs currently, like de or en
     * @param {*} task current task id, like "task1"
     * @param {*} sources array of sources as used in other api methods
     * @param {*} callback method to receive sse updates
     * @returns promise, resolves when sse is done
     */
    codeReview(language, task, sources, callback) {
        return postWithSse(this.url, "code-review/init/" + this.collectionRef + "/" + task + "?context=" + encodeURIComponent(this.context) + "&language=" + language, {sources}, callback);
    }

    /**
     * Start SSE based code help with current sources, it is the same as review, server will check if
     * it is a help or review
     * 
     * @param {*} language language this client runs currently, like de or en
     * @param {*} task current task id, like "task1"
     * @param {*} sources array of sources as used in other api methods
     * @param {*} callback method to receive sse updates
     * @returns promise, resolves when sse is done
     */
    codeHelp(language, task, sources, message, callback) {
        return postWithSse(this.url, "code-review/init/" + this.collectionRef + "/" + task + "?context=" + encodeURIComponent(this.context) + "&language=" + language + "&message=" + encodeURIComponent(message), {sources}, callback);
    }

    /**
     * Ask question based on current code review / help
     * 
     * @param {*} language language this client runs currently, like de or en
     * @param {*} ref codeReview call will give a ref, which is used here to continue the conversation
     * @param {*} message additional message for this conversation
     * @param {*} callback method to receive sse updates
     * @returns promise, resolves when sse is done
     */
    codeReviewContinue(language, ref, message, callback) {
        return postWithSse(this.url, "code-review/continue/" + this.collectionRef + "/" + ref + "?language=" + language, {message}, callback);
    }

    /**
     * When editor is restartet, this might be used to load the latest code review
     * 
     * @param {*} task current task id, like "task1"
     * @returns object with messages array
     */
    codeReviewLoadLatest(task) {
        return get(this.url, "code-review/load/" + this.collectionRef + "/" + task);
    }

    static join(url, key, context = "") {
        return new Promise((resolve, reject) => {
            const ref = url + '@' + key + '?' + context;
            if (sessions[ref]) {
                return resolve(sessions[ref]);
            }
            let service = new CodingArsService(url, context);
            service.join(key).then(collection => {
                sessions[ref] = service;
                resolve(service);
            }).catch(err => reject(err));
        })
    }

    static reJoin(url, session, context = "") {
        return new Promise((resolve, reject) => {
            const ref = url + '@' + key + '?' + context;
            if (sessions[ref]) {
                return resolve(sessions[ref]);
            }
            let service = new CodingArsService(url, context);
            service.reJoin(session).then(collection => {
                sessions[ref] = service;
                resolve(service);
            }).catch(err => reject(err));
        })
    }
}