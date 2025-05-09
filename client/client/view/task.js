import { editorViewElement } from "./element/editor";
import { fileSelectorViewElement } from "./element/fileSelector";
import { waitViewElement } from "./element/wait";
import { tabViewElement } from "./element/tab";
import { solutionViewElement } from "./element/solution";
import { collapsibleViewElement } from "./element/collapsible";
import { testResultViewElement } from "./element/testResult";
import { buttonBarViewElement } from "./element/buttonBar";
import { errorMessage, successMessage } from "../utils/message";
import { translator } from "../language";
import { modalViewElement } from "./element/modal";

export function taskView(options) {
    const translate = translator(options.language);

    let container = document.createElement('div');
    container.classList.add("coding-ars");
    container.classList.add('coding-ars-inactive');

    let content = document.createElement("div");
    content.classList.add("coding-ars-content");
    container.appendChild(content);

    let fileSelector = fileSelectorViewElement();
    content.appendChild(fileSelector);

    let editorView = editorViewElement(options);
    content.appendChild(editorView);
    
    let topButtonBar = buttonBarViewElement();
    let closeButton = topButtonBar.controller.addButton('close-icon');
    closeButton.classList.add('coding-ars-close-button');
    closeButton.addEventListener('click', () => container.dispatchEvent(new Event('coding-ars-show-collection')))
    topButtonBar.classList.add('coding-ars-top-button-bar');
    content.appendChild(topButtonBar);

    let tabView = tabViewElement();
    container.appendChild(tabView);

    let descriptionTab = tabView.controller.addTab(translate('DESCRIPTION'));
    let outputTab = tabView.controller.addTab(translate('RESULT'));
    let sampleTab = tabView.controller.addTab(translate('SAMPLE_SOLUTION'));
    let terminalTab = tabView.controller.addTab(translate('TERMINAL'));
    let loadButton = tabView.controller.addButton('download-icon');
    let resetButton = tabView.controller.addButton('trash-icon');
    let runButton = tabView.controller.addButton('play-icon', 10000);
    let testButton = tabView.controller.addButton('play-icon', 10000);

    outputTab.classList.add('coding-ars-task-result');

    let terminalContainer = document.createElement("div");
    terminalContainer.id = "terminal-container";
    terminalContainer.style.height = "100%";
    terminalTab.controller.replaceContent(terminalContainer);
    terminalTab.controller.activate();

    resetButton.controller.hide();
    sampleTab.controller.hide();

    // Virtual created element, has to be added to response tab when needed
    let testResult = testResultViewElement(options);

    tabView.addEventListener('coding-ars-tab-view-active', () => container.classList.add('coding-ars-tab-view-active'), true);
    tabView.addEventListener('coding-ars-tab-view-inactive', () => container.classList.remove('coding-ars-tab-view-active'), true);

    let waiter = waitViewElement();
    container.appendChild(waiter);


    const showDescription = (title, text, useCodeReview, minScore, maxScore) => {
        let content = document.createElement('div');
        if(useCodeReview) {
            text += `\n\n_${translate('MIN_SCORE_NOTE', '', {"score": minScore + "/" + maxScore})}_`;
        }
        content.innerHTML = (marked ? marked.parse(text) : text);
        descriptionTab.controller.replaceContent(content);
        descriptionTab.controller.activate();
    }

    let sampleSolutionLoaded;
    const loadSampleSolution = () => {
        if(sampleSolutionLoaded) {
            return;
        }
        container.dispatchEvent(new Event('coding-ars-load-sample-solution'));
    }

    const showSampleSolution = (data) => {
        sampleSolutionLoaded = true;
        let sources = document.createElement('div');
        let first = true;
        sources.classList.add('sources');
        (data.files || []).forEach(source => {
            let elementContainer = collapsibleViewElement();
            let pre = document.createElement('pre');
            let code = document.createElement('code');
            code.textContent = source.content;
            if((source.path || "").endsWith('.py')) {
                code.classList.add('python');
            } else if((source.path || "").endsWith('.java')) {
                code.classList.add('java');
            }
            pre.appendChild(code);
            elementContainer.controller.title(source.path);
            elementContainer.controller.appendToContent(pre);
            sources.appendChild(elementContainer);
            if(first) {
                window.setTimeout(() => elementContainer.controller.open());
                first = false;
            }
            hljs.highlightBlock(code);
        });
        sampleTab.controller.replaceContent(sources);
    };

    let testsOk, usedSamples;
    sampleTab.addEventListener('coding-ars-tab-view-active', () => {
        if(sampleSolutionLoaded) {
            return;
        }
        if(testsOk || usedSamples) {
            loadSampleSolution();
        } else {
            let warning = document.createElement("div");
            let warningText = document.createElement("p");
            let warningButtons = document.createElement("div");
            let warningButton = document.createElement("button");
            warningButtons.classList.add('coding-ars-buttons');
            warningButton.classList.add('active');
            warningText.textContent = translate('ASK_FOR_SHOW_SAMPLE_SOLUTION');
            warningButton.textContent = translate('SHOW');
            warningButtons.appendChild(warningButton);
            warning.appendChild(warningText)
            warning.appendChild(warningButtons)

            warningButton.addEventListener('click', () => loadSampleSolution());
            sampleTab.controller.replaceContent(warning);
        }
    });

    let solutionTab;
    let solutions;

    const initSolutions = (focus) => {
        if(solutionTab || options.disableSolutions) {
            return;
        }
        solutionTab = tabView.controller.addTab(translate('SOLUTIONS'));
        solutions = solutionViewElement();
        solutionTab.controller.replaceContent(solutions);
        solutionTab.addEventListener('coding-ars-tab-view-active', () => {
            solutionTab.dispatchEvent(new Event('coding-ars-show-solutions'));
        });
        if(focus) {
            solutionTab.controller.activate();
        }
    };

    const showSolutions = (data) => {
        solutions.controller.show(data);
    };

    let files = [];
    let editorApi;
    let controller = {};
    let canTest;
    let maxScore;
    controller.show = (data) => {
        // catch configurated content
        const existing = (options.files || {})[data.name] || [];
        // Handle file editable files
        (data.files || []).forEach(el => {
            let find = (data.sources || []).find(el2 => el.path == el2.path) || {};
            let ex = existing.find(el2 => el.path == el2.path) || {};
            let file = {
                path: el.path,
                original: el.content,
                content: ex.content || find.content || el.content,
                test: false,
                active: false
            }
            files.push(file);
            fileSelector.controller.add(el.path, (activate) =>
                editorApi.switch(file.path).then(activate)
            );
        });
        // Handle test files
        (data.testFiles || []).forEach(el => {
            let file = {
                path: el.path,
                content: el.content,
                test: true,
                active: false
            }
            files.push(file);
            fileSelector.controller.add(el.path, (activate) =>
                editorApi.switch(file.path).then(activate)
            );
        });
        if (files.length > 0) {
            files[0].active = true;
            fileSelector.controller.activate(0);
        }

        resetButton.controller.show();
        resetButton.addEventListener('click', () => {
            if(window.confirm(translate('RESET_CURRENT_SOLUTION'))) {
                editorApi.reset();
            }
        })

        container.classList.add("files-active");

        // Show description
        maxScore = data.maxScore || 10;
        showDescription(data.title, data.description, data.useCodeReview, data.minScore || 0, maxScore); 

        canTest = !!data.canTest;
        if(data.canTest) {
            // if we can test, we don't need to run
            runButton.controller.hide();
        } else {
            // we can't test? ok - hide test
            testButton.controller.hide();
            if(data.canRun) {
                // nothing to do
            } else {
                // we can't test? ok - hide test
                runButton.controller.hide();
                controller.warn("No test or run for task");
            }
        }

        // Show result if already tested
        if(data.testsOk) {
            showResultMessage({message: translate('ALREADY_TESTED')});
            initSolutions();
            testsOk = data.testsOk;
        }

        if(data.allowSampleSolution && !options.disableSample) {
            sampleTab.controller.show();
        }

        if(data.usedSamples) {
            usedSamples = data.usedSamples;
        }

        // Start Editor
        controller.activateEditor().then(() => {
            console.log("Editor activated")
        });
    };

    const checkOrRecreateEditor = () => {
        return new Promise((resolve, reject) => {
            if(editorView.controller.initiated()) {
                resolve();
            } else {
                editorView.controller.init().then(editorApiRef => {
                    editorApi = editorApiRef;
                    resolve();
                })
            }
        });
    }

    controller.activateEditor = () => {
        return new Promise((resolve, reject) => {
            container.monacoModelStarting = window.setTimeout(_ => {
                checkOrRecreateEditor().then(() => {
                    container.monacoModelStarting = undefined;
                    editorApi.create(files).then(() => {
                        editorApi.switch(files.find(el => el.active).path).then(() => {
                            container.classList.add('coding-ars-active');
                            container.classList.remove('coding-ars-inactive');
                            resolve();
                        });
                    })
                })
            }, 500);
        })
    };
    controller.value = () => {
        return new Promise((resolve, reject) => {
            editorApi.value().then(response => {
                (response.contents || []).forEach(el => {
                    let file = files.find(el2 => el.path == el2.path);
                    if(file) {
                        file.content = el.content;
                    }
                });
                resolve(
                    files
                        .filter(el => !el.test)
                        .map(el => ({content: el.content, filename: el.path}))
                )
            })
        });
    }
    controller.disposeEditor = () => {
        return new Promise((resolve, reject) => {
            if (container.monacoModelStarting) {
                window.clearTimeout(container.monacoModelStarting);
            }
            editorApi.value().then(response => {
                (response.contents || []).forEach(el => {
                    let file = files.find(el2 => el.path == el2.path);
                    if(file) {
                        file.content = el.content;
                    }
                });

                editorApi.dispose();
                resolve();
            })
            container.monacoModelStarting = undefined;
            container.classList.remove('coding-ars-active');
            container.classList.add('coding-ars-inactive');
        })
    };

    let outputCollapsibles = [];
    const createOutputCollapsible = (title) => {
        const coll = collapsibleViewElement();
        coll.controller.title(title);
        outputTab.controller.appendContent(coll);
        outputCollapsibles.push(coll);
        return coll;
    };

    const clearOutputCollapsibles = () => {
        outputCollapsibles.forEach(el => el.remove());
        outputCollapsibles = [];
    };

    const closeAllOutputCollapsibles = () => {
        outputCollapsibles.forEach(el => el.controller.close());
    };

    const openOutputCollapsible = (col) => {
        closeAllOutputCollapsibles();
        col.controller.open();
    };

    const showResultMessage = (result) => {
        clearOutputCollapsibles();
        const consoleContainer = createOutputCollapsible(translate('CONSOLE'));

        const consoleBox = document.createElement('div');
        consoleBox.classList.add('coding-ars-info-content-wrapper');
        consoleContainer.controller.appendToContent(consoleBox);
        
        const pre = document.createElement('pre');
        consoleBox.appendChild(pre);
        // Result message is mostly in message, if not print result as whole
        pre.textContent = result.message || result;

        // Show output tab
        outputTab.controller.activate();

        // If result is not a string
        if(!(typeof result === 'string')) {
            // Check if we have test results
            result.testResults = result.testResults || [];
            if(result.successfulTests) {
                result.testResults = result.testResults.concat(result.successfulTests);
            }
            if(result.failedTests) {
                result.testResults = result.testResults.concat(result.failedTests);
            }
            (result.expected || []).forEach(ex => {
                const found = result.testResults.find(tr => tr.message == ex.message && tr.type == ex.type);
                if(!found) {
                    result.testResults.push({
                        type: ex.type,
                        message: ex.message,
                        missing: true,
                        failed: true,
                        expected: ex.expected
                    });
                }
            });
            if(result.stdout) {
                pre.textContent += "\n\n" + result.stdout;
            }
            if(result.testResults && result.testResults.length) {
                const testContainer = createOutputCollapsible(translate('TESTS'));

                const testBox = document.createElement('div');
                testBox.classList.add('coding-ars-info-content-wrapper');
                testContainer.controller.appendToContent(testBox);
                testBox.appendChild(testResult);
                
                testResult.controller.replaceResults(result.testResults);
                if(result.testsOk) {
                    container.dispatchEvent(successMessage(translate('SUCCESS_MSG_TESTS')));
                    testsOk = true;
                    initSolutions();
                    testContainer.controller.good();
                    consoleContainer.controller.good();
                    
                } else {
                    container.dispatchEvent(errorMessage(translate('FAILED_MSG_TESTS')));
                    testContainer.controller.bad();
                    consoleContainer.controller.bad();
                }
                openOutputCollapsible(testContainer);
            } else {
                if(result.compileResults && result.compileResults.length) {
                    container.dispatchEvent(errorMessage(translate('COMPILE_ERROR_MSG')));
                    consoleContainer.controller.bad();
                } else if(result.message.indexOf("Error in") >= 0) {
                    consoleContainer.controller.bad();
                } else {
                    consoleContainer.controller.good();
                }
                openOutputCollapsible(consoleContainer);
            }
        } else {
            openOutputCollapsible(consoleContainer);
        }
    }

    controller.handleResult = (result, good) => {
        showResultMessage(result);
        runButton.controller.stopWait();
        testButton.controller.stopWait();
        runButton.controller.enable();
        testButton.controller.enable();

        terminalTab.controller.activate();

        if((!canTest && good)) {
            container.dispatchEvent(successMessage(translate('SUCCESS_MSG_RUN')));
            testsOk = true;
            initSolutions();
        }
    }

    controller.showLatestCodeReview = (messages, score, minScore) => {
        // Message array roles as assistant / user combined with content
        // Server hides internel messages, so we can just show them
        const reviewContainer = createOutputCollapsible(translate('CODE_REVIEW'));
        const reviewBox = document.createElement('div');
        reviewBox.classList.add('coding-ars-info-content-wrapper');
        reviewContainer.controller.appendToContent(reviewBox);

        let first = true;
        let noCodeReview = false;
        messages.forEach(el => {
            if(!first) {
                let hr = document.createElement('hr');
                reviewBox.appendChild(hr);
            }
            let resultTextContainer = document.createElement('div');
            resultTextContainer.classList.add(el.role === "user" ? 'coding-ars-code-review-question' : 'coding-ars-code-review-message');
            reviewBox.appendChild(resultTextContainer);
            resultTextContainer.innerHTML = (el.role === "user" ? "<strong>You:</strong> " + el.content : (marked ? marked.parse(el.content) : el.content));
            first = false;

            if(el.role === "user") {
                if(el.content.toLowerCase().indexOf("no-code-review") >= 0) {
                    noCodeReview = true;
                }
            }
        });

        // Add markers and restore state
        if(first) {
            reviewContainer.controller.neutral();
            tabView.controller.setState(translate("SUBMITTED_SOLUTION_MISSING_CODE_REVIEW"), tabView.controller.STATE_NEUTRAL);
            let resultTextContainer = document.createElement('div');
            resultTextContainer.classList.add('coding-ars-code-review-message');
            resultTextContainer.textContent = translate('PLEASE_RUN_CODE_AGAIN');
            reviewBox.appendChild(resultTextContainer);
        } else if(noCodeReview) {
            reviewContainer.controller.neutral();
            tabView.controller.setState(translate("SUBMITTED_SOLUTION_WITH_NO_CODE_REVIEW"), tabView.controller.STATE_NEUTRAL);
        } else if(score && score.ratio >= (minScore || 0)) {
            reviewContainer.controller.good();
            tabView.controller.setState(translate("SUBMITTED_SOLUTION_SUCCESSFUL"), tabView.controller.STATE_SUCCESS);
        } else {
            reviewContainer.controller.bad();
            tabView.controller.setState(translate("SUBMITTED_SOLUTION_WITH_BAD_SCORE", "", {"score": (minScore * maxScore) + "/" + (maxScore)}), tabView.controller.STATE_FAILED);
        }
    };

    const modal = modalViewElement();
    container.appendChild(modal);

    controller.startCodeReview = (success, startReview, startHelp, noCodeReview, badCodeReview) => {
        // Update state
        tabView.controller.hideState();
        if(success) {
            tabView.controller.setState(translate("NEW_SOLUTION_SUBMITTED"), tabView.controller.STATE_NEUTRAL);
        }
        const reviewContainer = createOutputCollapsible(success ? translate('CODE_REVIEW') : translate('CODE_HELP'));

        const reviewBox = document.createElement('div');
        reviewBox.classList.add('coding-ars-info-content-wrapper');
        reviewContainer.controller.appendToContent(reviewBox);

        const loadingIndicator = document.createElement('div');
        loadingIndicator.classList.add('coding-ars-chat-loading');
        loadingIndicator.innerHTML = '<div class="lds-ellipsis"><div></div><div></div><div></div><div></div></div>';

        // Present Button for "Show Help" or "Start Review"
        let buttonContainer = document.createElement('div');
        buttonContainer.classList.add('coding-ars-code-review-buttons');
        let buttonNote = document.createElement('div');
        buttonNote.textContent = success ? translate('CODE_REVIEW_NOTE') : translate('CODE_HELP_NOTE');
        buttonNote.classList.add('coding-ars-code-review-note');
        let helpInput = document.createElement('input');
        helpInput.placeholder = translate('CODE_HELP_PLACEHOLDER');
        let startHelpButton = document.createElement('button');
        startHelpButton.textContent = translate('START_HELP');
        let startReviewButton = document.createElement('button');
        startReviewButton.textContent = translate('START_CODE_REVIEW');
        let additionallButtons = document.createElement('div');
        additionallButtons.classList.add('coding-ars-code-review-additional-buttons');
        let iDontWantToUseCodeReview = document.createElement('a');
        iDontWantToUseCodeReview.textContent = translate('I_DONT_WANT_TO_USE_CODE_REVIEW');
        iDontWantToUseCodeReview.addEventListener('click', () => {
            modal.controller.open({
                title: translate('I_DONT_WANT_TO_USE_CODE_REVIEW'),
                content: translate('I_DONT_WANT_TO_USE_CODE_REVIEW_TEXT'),
                buttons: [
                    {
                        text: translate('ABORT'),
                        className: 'coding-ars-button-secondary',
                        onClick: (_, controller) => {
                            controller.close();
                        }
                    },
                    {
                        text: translate('CONFIRM'),
                        className: 'coding-ars-button-success',
                        onClick: (_, controller) => {
                            if(noCodeReview) {
                                noCodeReview();
                            }
                            controller.close();
                            buttonContainer.remove();
                            buttonNote.remove();
                            additionallButtons.remove();
                            resultTextContainer.innerHTML = "<strong>You:</strong> No-Code-Review";
                            reviewContainer.controller.neutral();
                            tabView.controller.setState(translate("SUBMITTED_SOLUTION_WITH_NO_CODE_REVIEW"), tabView.controller.STATE_NEUTRAL);
                        }
                    }
                ],
                onOpen: () => {
                    
                }
            });
        });
        let terms = document.createElement('a');
        terms.textContent = translate('CODE_REVIEW_TERMS');
        terms.addEventListener('click', () => {
            modal.controller.open({
                title: translate('CODE_REVIEW_TERMS'),
                content: marked ? marked.parse(translate('CODE_REVIEW_TERMS_TEXT')) : translate('CODE_REVIEW_TERMS_TEXT'),
                onOpen: () => {
                    
                }
            });
        });
        additionallButtons.appendChild(terms);
        let thisIsABadReview = document.createElement('a');
        thisIsABadReview.textContent = translate('THIS_IS_A_BAD_REVIEW');
        additionallButtons.appendChild(thisIsABadReview);
        thisIsABadReview.style.display = 'none';
        thisIsABadReview.addEventListener('click', () => {
            const content = document.createElement('div');
            content.innerHTML = `<p>${translate('THIS_IS_A_BAD_REVIEW_TEXT')}</p><p><input type="text" placeholder="${translate('THIS_IS_A_BAD_REVIEW_PLACEHOLDER')}"></p>`;
            const input = content.querySelector("input");
            modal.controller.open({
                title: translate('THIS_IS_A_BAD_REVIEW'),
                content: content,
                buttons: [
                    {
                        text: translate('ABORT'),
                        className: 'coding-ars-button-secondary',
                        onClick: (_, controller) => {
                            controller.close();
                        }
                    },
                    {
                        text: translate('CONFIRM'),
                        className: 'coding-ars-button-success',
                        onClick: (_, controller) => {
                            if(badCodeReview) {
                                badCodeReview(input.value || "no-reason-provided");
                            }
                            controller.close();
                            buttonContainer.remove();
                            buttonNote.remove();
                            additionallButtons.remove();
                            const box = reviewBox.querySelector('.coding-ars-code-review-response');
                            if(box) {
                                // Chat box is shown?
                                box.remove();
                            }
                        }
                    }
                ],
                onOpen: () => {
                    
                }
            });
        });
        
        if(success) {
            additionallButtons.appendChild(iDontWantToUseCodeReview);
            buttonContainer.appendChild(startReviewButton);
        } else {
            buttonContainer.appendChild(helpInput);
            buttonContainer.appendChild(startHelpButton);
        }
        reviewBox.appendChild(buttonNote);
        reviewBox.appendChild(buttonContainer);
        reviewBox.appendChild(additionallButtons);
        startReviewButton.addEventListener('click', () => {
            buttonContainer.remove();
            buttonNote.remove();
            additionallButtons.remove();
            reviewContainer.controller.appendToContent(loadingIndicator);
            startReview();
        });
        const startHelpHandler = () => {
            buttonContainer.remove();
            buttonNote.remove();
            additionallButtons.remove();
            reviewContainer.controller.appendToContent(loadingIndicator);
            startHelp(helpInput.value || translate('CODE_HELP_PLACEHOLDER'));
        };
        startHelpButton.addEventListener('click', () => startHelpHandler());

        helpInput.addEventListener('keydown', (e) => {
            if(e.key === "Enter") {
                startHelpHandler();
            }
        });

        let rollback = () => {
            result = "";
            reviewBox.innerHTML = "";
            reviewBox.appendChild(buttonNote);
            reviewBox.appendChild(buttonContainer);
            reviewBox.appendChild(resultTextContainer);
            reviewBox.appendChild(additionallButtons);
        }

        let resultTextContainer = document.createElement('div');
        resultTextContainer.classList.add('coding-ars-code-review-message');

        let shouldAutoScroll = true;
        const tabsEntry = reviewBox.closest('.coding-ars-tabs-entry');
        const userScrollHandler = (e) => {
            const isAtBottom = Math.abs((tabsEntry.scrollHeight - tabsEntry.scrollTop - tabsEntry.clientHeight)) < 10;
            if (!isAtBottom) {
                shouldAutoScroll = false;
            } else {
                shouldAutoScroll = true;
            }
        };
        const scrollInViewForText = () => {
            if (shouldAutoScroll) {
                requestAnimationFrame ? requestAnimationFrame(() => {
                    reviewBox.closest('.coding-ars-tabs-entry').scrollTop = resultTextContainer.offsetTop;
                }) : undefined;
            }
        };
        tabsEntry.addEventListener('scroll', userScrollHandler);

        reviewBox.appendChild(resultTextContainer);

        if(success) {
            openOutputCollapsible(reviewContainer);
        }

        let result = "";
        let rollbackTriggered = false;
        let first = true;
        let finishes = 0;
        let receivedScore;
        let receivedMinScore;
        let reviewCtrl = {
            append: (content) => {
                // remove loading indicator, if present
                if(loadingIndicator.parentElement) {
                    loadingIndicator.remove();
                }

                result += content;
                resultTextContainer.innerHTML = marked ? marked.parse(result) : result;
                reviewContainer.controller.fixContent();
                scrollInViewForText();
            },
            rollbackWithError: (message) => {
                // remove loading indicator, if present
                if(loadingIndicator.parentElement) {
                    loadingIndicator.remove();
                }

                container.dispatchEvent(errorMessage(translate('CODE_REVIEW_FAILED')));
                resultTextContainer.innerHTML = "";
                rollback();
                rollbackTriggered = true;
            },
            score: (score, min) => {
                receivedScore = score;
                receivedMinScore = min;
            },
            finishCodeReview: (furtherQuestionCallback) => {
                // remove loading indicator, if present
                if(loadingIndicator.parentElement) {
                    loadingIndicator.remove();
                }

                if(rollbackTriggered) {
                    rollbackTriggered = false;
                    return;
                }
                if(first && success) {
                    if(receivedScore && receivedScore.ratio >= (receivedMinScore || 0)) {
                        reviewContainer.controller.good();
                        tabView.controller.setState(translate("SUBMITTED_SOLUTION_SUCCESSFUL"), tabView.controller.STATE_SUCCESS);
                    } else {
                        reviewContainer.controller.bad();
                        tabView.controller.setState(translate("SUBMITTED_SOLUTION_WITH_BAD_SCORE", "", {"score": (receivedMinScore * maxScore) + "/" + (maxScore)}), tabView.controller.STATE_FAILED);
                    }
                    if(iDontWantToUseCodeReview.parentElement) {
                        iDontWantToUseCodeReview.remove();
                    }
                    first = false;
                    thisIsABadReview.style.display = 'inline';
                }
                finishes ++;
                if(furtherQuestionCallback && finishes <= 3) {
                    let box = document.createElement('div');
                    let input = document.createElement('input');
                    input.placeholder = translate('CODE_ADDITIONAL_QUESTION_PLACEHOLDER');
                    let submit = document.createElement('button');
                    reviewBox.appendChild(box);
                    reviewBox.appendChild(additionallButtons);
                    box.appendChild(input);
                    box.appendChild(submit);
        
                    submit.textContent = translate('SEND');
                    box.classList.add('coding-ars-code-review-response');

                    const handleAdditionalQuestion = () => {
                        if(!input.value) {
                            return;
                        }
                        shouldAutoScroll = true; // reset scroll behavior
                        let hr1 = document.createElement('hr');
                        let hr2 = document.createElement('hr');
                        let questionContainer = document.createElement('div');
                        questionContainer.classList.add('coding-ars-code-review-question');
                        resultTextContainer = document.createElement('div');
                        resultTextContainer.classList.add('coding-ars-code-review-message');
                        reviewBox.appendChild(hr1);
                        reviewBox.appendChild(questionContainer);
                        reviewBox.appendChild(hr2);
                        reviewBox.appendChild(resultTextContainer);
                        questionContainer.innerHTML = "<strong>You:</strong> " + input.value;
                        result = "";
                        furtherQuestionCallback(input.value, reviewCtrl);
                        rollback = () => {
                            hr1.remove();
                            hr2.remove();
                            questionContainer.remove();
                            resultTextContainer.remove();
                            reviewBox.appendChild(box);
                            reviewBox.appendChild(additionallButtons);
                        };
                        box.remove();
                        additionallButtons.remove();
                    };
                    submit.addEventListener('click', () => handleAdditionalQuestion());
                    input.addEventListener('keydown', (e) => {
                        if(e.key === "Enter") {
                            handleAdditionalQuestion();
                        }
                    });
                } else if(furtherQuestionCallback && finishes > 3) {
                    let hr = document.createElement('hr');
                    let buttonNote = document.createElement('div');
                    buttonNote.textContent = success ? translate('MAX_CODE_REVIEW_NOTE') : translate('MAX_CODE_REVIEW_NOTE');
                    buttonNote.classList.add('coding-ars-code-review-note');
                    reviewBox.appendChild(hr);
                    reviewBox.appendChild(buttonNote);
                }

                reviewContainer.controller.fixContent();
                scrollInViewForText();
            }
        };
        return reviewCtrl;
    };


    controller.showSolutions = (data) => {
        showSolutions(data);
    }

    controller.showSampleSolution = (data) => {
        showSampleSolution(data);
    }

    controller.updateThumbs = (ref, thumbs, thumbed) => {
        solutions.controller.updateThumbs(ref, thumbs, thumbed);
    }

    controller.initTerminalService = (url) => {
        import("../service/terminal").then(({ TerminalService }) => {
          controller.terminalService = new TerminalService(url, {
            task: options.task,
            target: terminalContainer,
            language: options.language,
          });
        });
      };

    let runOrTest = (eventName) => {
        controller.value().then(files => {
            let ev = new Event(eventName);
            ev.files = files;
            container.dispatchEvent(ev);
        })
    }

    const canExecute = () => {
        if(runButton.controller.isWaiting() || !runButton.controller.isEnabled()) {
            return false;
        }
        if(testButton.controller.isWaiting() || !testButton.controller.isEnabled()) {
            return false;
        }
        return true;
    }

    runButton.addEventListener('click', _ => {
        if(!canExecute()) {
            return;
        }
        runButton.controller.wait();
        testButton.controller.disable();
        runOrTest('coding-ars-run')
    });
    
    testButton.addEventListener('click', _ => {
        if(!canExecute()) {
            return;
        }
        runButton.controller.disable();
        testButton.controller.wait();
        runOrTest('coding-ars-test')
    });
    
    loadButton.addEventListener('click', _ => {
        container.dispatchEvent(new Event('coding-ars-download'))
    })

    controller.addToolbarButton = (icon) => topButtonBar.controller.addButton(icon);

    container.controller = controller;

    return container;
};