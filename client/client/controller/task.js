import { taskView } from "../view/task";
import { errorMessage } from "../utils/message";
import { translator } from "../language";

export function taskController(target, codingArs, task, options) {
    const translate = translator(options.language);
    return new Promise((resolve, reject) => {
        let tv = taskView(options);
        let currentTask = undefined;
        target.appendChild(tv);

        const save = () => tv.controller.value()
            .then(files => codingArs.save(task, files));
        const load = () => {
            save().then(() => {
                var link = document.createElement("a");
                link.href = codingArs.loadUrl(task);
                document.body.appendChild(link);
                link.click();
                link.remove();
            })
        }
    
        console.log(`load task details for "${task}" from backend`);
        codingArs.task(task).then(data => {
            console.log(`received task details for "${task}" from backend`);
            currentTask = data;
            tv.controller.show(data);
            tv.controller.initTerminalService(codingArs.url);
            resolve({
                dispose: () => {
                    console.log("dispose task controller");
                    if (tv.controller.terminalService) {
                        tv.controller.terminalService.dispose();
                        tv.controller.terminalService = null;
                    }
                    target.removeChild(tv);
                },
                activateEditor: () => tv.controller.activateEditor(),
                disposeEditor: () => tv.controller.disposeEditor(),
                save,
                load,
                addToolbarButton: tv.controller.addToolbarButton
            });

            // Restore code review if available
            if(currentTask.useCodeReview && data.testsOk) {
                console.log(`restore code review for task "${task}"`);
                codingArs.codeReviewLoadLatest(data.name).then((review) => {
                    tv.controller.showLatestCodeReview(review.messages || [], review.score || 0, review.minScore || 0, review.maxScore || 0);
                }).catch(err => {
                    console.error(String(err));
                    target.dispatchEvent(errorMessage(translate('ERROR_WHILE_LOADING_CODE_REVIEW')));
                });
            }
        }).catch(err => {
            console.error(String(err));
            target.dispatchEvent(errorMessage(translate(COULD_NOT_LOAD_TASK)));
        });
    
        let handleRunOrTest = (result, tested, files) => {
            console.log(`received result for execution of task "${task}"`);
            let output = {message: result.runOutput || translate("NO_OUTPUT")};
            let good = true;
            if(result.compileResults && result.compileResults.length) {
                output.message = "";
                result.compileResults.forEach(el => output.message += `${output.message?'\n\n':''}Error in ${el.path}:\n${el.errors}`)
                good = false;
            } else if(result.testOutput) {
                output = result.testOutput;
                good = result.testOutput.testsOk;
            } else if (result.success != undefined) {
                good = result.success;
            }
            tv.controller.handleResult(output, good, tested);

            // broadcast score from code review
            const runOrTestEvent = new Event('coding-ars-run-or-test-result');
            runOrTestEvent.good = good;
            runOrTestEvent.tested = tested;
            runOrTestEvent.task = task;
            target.dispatchEvent(runOrTestEvent);

            // Start review if run or test was successful
            if(currentTask && currentTask.useCodeReview) {
                console.log(`trigger code-review for task "${task}"`, files);
                let ref = "";
                const startReviewOrHelp = (review, message = "") => {
                    let handleEventData = (eventData) => {
                        // new text data
                        if(eventData.token) {
                            writer.append(eventData.token);
                        }
                        // we get a ref id for further communication
                        if(eventData.ref) {
                            ref = eventData.ref;
                        }
                        if(eventData.score) {
                            // broadcast score from code review
                            const event = new Event('coding-ars-code-review-score');
                            event.score = eventData.score;
                            event.minScore = eventData.minScore;
                            event.task = eventData.task;
                            target.dispatchEvent(event);
                            writer.score(eventData.score, eventData.minScore);
                        }
                        if(eventData.error) {
                            console.error("Error while doing code review: " + eventData.message);
                            writer.rollbackWithError(eventData.message);
                        }
                        // we get a DONE signal
                        if(eventData.done) {
                            // if we have a ref, we provide a function for further communication
                            // otherwise we just finish the code review
                            writer.finishCodeReview(ref ? (request) => {
                                codingArs.codeReviewContinue(options.language, ref, request, handleEventData).then(() => {}).catch(err => {
                                    console.error(String(err));
                                    target.dispatchEvent(errorMessage(translate('ERROR_WHILE_CREATING_CODE_REVIEW')));
                                });
                            } : undefined);
                        }
                    };
                    if(review) {
                        codingArs.codeReview(options.language, task, files, handleEventData).then(() => {}).catch(err => {
                            console.error(String(err));
                            target.dispatchEvent(errorMessage(translate('ERROR_WHILE_CREATING_CODE_REVIEW')));
                        });
                    } else {
                        codingArs.codeHelp(options.language, task, files, message, handleEventData).then(() => {}).catch(err => {
                            console.error(String(err));
                            target.dispatchEvent(errorMessage(translate('ERROR_WHILE_CREATING_CODE_REVIEW')));
                        });
                    }
                };
                const writer = tv.controller.startCodeReview(
                    good, 
                    () => startReviewOrHelp(true), 
                    (msg) => startReviewOrHelp(false, msg),
                    () => {
                        codingArs.noCodeReview(options.language, task, files).then(() => {}).catch(err => {
                            console.error(String(err));
                            target.dispatchEvent(errorMessage(translate('ERROR_WHILE_CREATING_NO_CODE_REVIEW')));
                        });
                    },
                    (msg) => {
                        codingArs.badCodeReview(options.language, ref, msg).then(() => {}).catch(err => {
                            console.error(String(err));
                            target.dispatchEvent(errorMessage(translate('ERROR_WHILE_CREATING_NO_CODE_REVIEW')));
                        });
                    }
                );
            }
        };
        
        // Handle user event for loading zip file
        tv.addEventListener('coding-ars-download', (ev) => load());
    
        // Handle user event for starting normal run
        tv.addEventListener('coding-ars-run', (ev) => {
            console.log(`trigger run for task "${task}"`, ev.files);
            tv.controller.terminalService.clearTerminal();
            codingArs.run(task, ev.files).then(res => handleRunOrTest(res, false, ev.files)).catch(err => {
                console.error(String(err));
                target.dispatchEvent(errorMessage(translate('ERROR_WHILE_RUNNING_CODE')));
            });
        });

        // Handle user event for starting test
        tv.addEventListener('coding-ars-test', (ev) => {
            console.log(`trigger test for task "${task}"`, ev.files);
            tv.controller.terminalService.clearTerminal();
            codingArs.test(task, ev.files).then(res => handleRunOrTest(res, true, ev.files)).catch(err => {
                console.error(String(err));
                target.dispatchEvent(errorMessage(translate('ERROR_WHILE_TESTING_CODE')));
            });
        });
        
        // Handle user event for loading sample solutions
        tv.addEventListener('coding-ars-load-sample-solution', () => {
            codingArs.sampleSolution(task).then(data => {
                tv.controller.showSampleSolution(data);
            }).catch(err => {
                console.error(String(err));
                target.dispatchEvent(errorMessage(translate('COULD_NOT_LOAD_SAMPLE_SOLUTION')));
            });
        });
        
        // Handle user event for loading solutions of other users
        tv.addEventListener('coding-ars-show-solutions', () => {
            console.log(`list solutions for task ${task}`);
            codingArs.listSolutions(task).then(data => {
                tv.controller.showSolutions(data);
            }).catch(err => {
                console.error(String(err));
                if(err.status == 400) {
                    target.dispatchEvent(errorMessage(translate('OWN_SOLUTION_REQUIRED')));
                } else {
                    target.dispatchEvent(errorMessage(translate('NO_SAMPLE_SOLUTION')));
                }
            });
        }, true);
        
        // Handle user event for adding thumb up or down to solutions from other users
        tv.addEventListener('coding-ars-thumb-up', ev => {
            console.log(`thumb up solution ${ev.solutionRef} for task ${task}`);
            codingArs.thumbToggle(ev.solutionRef).then(result => {
                tv.controller.updateThumbs(ev.solutionRef, result.thumbs, result.thumbed);
            }).catch(err => {
                console.error(String(err));
                target.dispatchEvent(errorMessage(translate('ERROR_WHILE_GRADING')));
            });
        }, true);
    });
}