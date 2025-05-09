import { CodingArsService } from "../service/codingars";
import { taskController } from "./task";
import { collectionController } from "./collection";
import { keyController } from "./key";
import { messageView } from "../view/message";
import { errorMessage } from "../utils/message";
import { translator } from "../language";

export function clientController(target, url, key, options, task = undefined, token = undefined, session = undefined, language = undefined) {
    console.log("start new coding ars client")
    return new Promise((resolve, reject) => {
        options = options || {};
        options.language = options.language || "de"; //TODO change default lang?
        options.context = options.context || "";
        const translate = translator(options.language);

        const controller = {};
        let msgView = messageView();
        target.appendChild(msgView);

        // Add listeners for messages (error, success and message)
        target.addEventListener('coding-ars-error', (ev) => msgView.controller.show(ev.msg, 'error'), true);
        target.addEventListener('coding-ars-success', (ev) => msgView.controller.show(ev.msg, 'success'), true);
        target.addEventListener('coding-ars-message', (ev) => msgView.controller.show(ev.msg), true);

        // Main client start up, handle switch between different views (task editor and task selection)
        const startMain = (codingArs) => {
            return new Promise((resolve, reject) => {
                let current;
                Object.defineProperty(controller, 'current', {
                    get: function() { return current }
                });
            
                // Start task view, clean up current content
                target.addEventListener('coding-ars-start-task', (ev) => {
                    if(!ev.task) {
                        console.log("Missing task name in start task event");
                        target.dispatchEvent(errorMessage(translate('COULD_NOT_START_TASK')));
                        return;
                    }
                    if(current) {
                        current.dispose();
                        current = undefined;
                    }
                    if(ev.singleTaskCollection) {
                        target.classList.add('single-task-mode');
                    }
                    console.log("start task controller for task " + ev.task);
                    taskController(target, codingArs, ev.task, options).then((ref) => {
                        current = ref;
                        const event = new Event('coding-ars-started-task');
                        event.task = ev.task;
                        target.dispatchEvent(event);
                    });
                }, true);

                // Start task selection view for this collection, clean up current content
                target.addEventListener('coding-ars-show-collection', (ev) => {
                    if(current) {
                        current.dispose();
                        current = undefined;
                    }
                    console.log("start collection controller to select tasks");
                    collectionController(target, codingArs, options).then((ref) => {
                        current = ref;
                        target.dispatchEvent(new Event('coding-ars-started-collection'));
                    });
                }, true);

                // If there is a provided task, jump directly into this task
                if(task) {
                    console.log("use in single task mode for task " + task);
                    let ev = new Event('coding-ars-start-task');
                    ev.task = task;
                    ev.singleTaskCollection = true;
                    target.dispatchEvent(ev);
                // Otherwise, show task selection of this collection
                } else {
                    console.log("start with task selection");
                    target.dispatchEvent(new Event('coding-ars-show-collection'));
                }

                resolve(controller);
            })
        }

        // Handle new service creation, in case of provided token push token to backend,
        // don't wait for response
        const handleService = codingArs => {
            return new Promise((resolve) => {
                console.log(`received response with session id and reference ${codingArs.collectionRef}`);
    
                const doStartMain = () => {
                    try {
                        startMain(codingArs).then(resolve);
                    } catch(err) {
                        console.error(String(err));
                    }
                };

                if(token) {
                    Promise.resolve(token).then(res => {
                        console.log(`identify with token`);
                        codingArs.identify(res).then(result => {
                            console.log(`identified with token`);
                            doStartMain();
                        }).catch(err => {
                            console.error(String(err));
                            doStartMain();
                        })
                    }).catch(err => {
                        console.error(String(err));
                        doStartMain();
                    })
                } else {
                    console.log(`no token, continue with starting app`);
                    doStartMain();
                }
            })
        }

        // Create coding ars service with new key
        const handleKey = () => {
            console.log("send join request with " + key);
            return CodingArsService.join(url, key, options.context).then(handleService);
        }

        // Create coding ars service with existing session identifier
        const handleSession = () => {
            console.log("rejoin request with " + session);
            return CodingArsService.reJoin(url, session, options.context).then(handleService);
        }

        // Three possible startup processes:
        // 1. Already logged in (identified by session), recreate CodingArsService instance without join-Request
        if(session) {
            console.log("use provided session identifier " + session);
            handleSession().then(resolve).catch(reject);
        // 2. Provided join-Key, use this and start client
        } else if(key) {
            console.log("use provided key " + key);
            handleKey().then(resolve).catch(reject);
        // 3. Nothing, show key form and wait until provided
        } else {
            console.log("ask for joining key by form");
            let current;
            target.addEventListener('coding-ars-key', (ev) => {
                key = ev.key;
                handleKey().then(() => current.dispose()).catch(err => {});
            }, true);

            keyController(target, options).then((ref) => current = ref)
            resolve(controller);
        }
    })
}