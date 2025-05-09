const getContainer = () => document.getElementById('editor-container');

const monacoBase = getContainer().getAttribute('data-monaco-base');

// Worker configuration vor dem require.config
self.MonacoEnvironment = {
    getWorkerUrl: function(moduleId, label) {
        return `${monacoBase}/base/worker/workerMain.js`;
    }
};

require.config({
    paths: { vs: monacoBase },
    'vs/css': { disabled: true }
});

const sendResponse = (ref, data) => {
    data = data || {};
    data.ref = ref;
    (window.parent ? window.parent : window).postMessage(data, '*');
};

window.addEventListener('message', function(e){
    try {
        let data = e.data;
        if(data.command == 'prepare') {
            require(['vs/editor/editor.main'], function () {
                if(data.ref) {
                    sendResponse(data.ref, {});
                }
            });
        } else if(data.command == 'create') {
            // Important note: Monaco checks document informations and will not work
            // if elements are not created within this iframe, as the main app creates 
            // the editor-container element, sometimes error will raise, because internal
            // checks are not passed. It is important at this point to remove the old
            // container and create a new one.
            
            const existingContainer = document.getElementById('editor-container');
            
            // Konfigurationen sichern
            const monacoBase = existingContainer ? existingContainer.getAttribute('data-monaco-base') : null;
            // Weitere Attribute, die Sie möglicherweise benötigen
            
            // Neuen Container erstellen
            const editorContainer = document.createElement('div');
            editorContainer.id = 'editor-container';
            editorContainer.style.width = '100%';
            editorContainer.style.height = '100%';
            
            // Konfigurationen wiederherstellen
            if (monacoBase) {
                editorContainer.setAttribute('data-monaco-base', monacoBase);
            }
            // Weitere Attribute übertragen
            
            // Alten Container ersetzen
            if (existingContainer && existingContainer.parentNode) {
                existingContainer.parentNode.replaceChild(editorContainer, existingContainer);
            } else {
                // Fallback, falls kein Container existiert
                document.body.appendChild(editorContainer);
            }

            const editorConfig = {
                // value: data.content,
                // language: data.language,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                theme: "vs-dark",
                fontSize: "16px",
                minimap: {
                    enabled: false
                }
            };
            console.log("Create editor with data", editorConfig);
            const editor = monaco.editor.create(editorContainer, editorConfig);
            console.log("Create sources", data.sources);
            editorContainer.monacoModels = [];
            for(var s of data.sources) {
                let language = 'java';
                if(s.path.endsWith('.py')) {
                    language = 'python';
                }
                console.log('Create model for', s.path, 'with language', language);
                let model = monaco.editor.createModel(s.content, language)
                model.pathRef = s.path;
                model.originalContent = s.original || s.content;
                model.useReadOnly = s.test;
                editorContainer.monacoModels.push(model);
            }
            if(editorContainer.monacoModels.length) {
                console.log('More then one model, focus first');
                editor.setModel(editorContainer.monacoModels[0]);
                editorContainer.activeModel = editorContainer.monacoModels[0];
                editor.focus();
            }
            editorContainer.monacoEditor = editor;
            if(data.ref) {
                sendResponse(data.ref, {});
            }
        } else if(data.command == 'switch') {
            let editorContainer = document.getElementById('editor-container');
            let editor = editorContainer.monacoEditor;
            let currentState = editor.saveViewState();
            editorContainer.activeModel.lastState = currentState;
            console.log('Swith to model with path', data.path);
            let element = editorContainer.monacoModels.find(el => el.pathRef == data.path);
            if(element) {
                editor.setModel(element);
                if(element.lastState) {
                    editor.restoreViewState(element.lastState);
                }
                editor.updateOptions({ readOnly: element.useReadOnly })
                editor.focus();
                editorContainer.activeModel = element;
            } else {
                console.error("Could not find model for " + data.path);
            }
            if(data.ref) {
                sendResponse(data.ref, {});
            }
        } else if(data.command == 'reset') {
            let editorContainer = document.getElementById('editor-container');
            editorContainer.monacoModels.forEach(model => {
                model.setValue(model.originalContent)
            })
        } else if(data.command == 'dispose') {
            let editorContainer = document.getElementById('editor-container');
            if(editorContainer.monacoEditor) {
                editorContainer.monacoModels.forEach(el => el.dispose())
                editorContainer.monacoEditor.dispose();
            }
            if(data.ref) {
                sendResponse(data.ref, {});
            }
        } else if(data.command == 'value') {
            if(data.ref) {
                let contents = [];
                let editorContainer = document.getElementById('editor-container');
                editorContainer.monacoModels.filter(el => !el.isDisposed() && !el.useReadOnly).forEach(el => contents.push({path: el.pathRef, content: el.getValue()}))
                sendResponse(data.ref, {contents});
            }
        }
    } catch(e) {
        console.error(e);
        return;
    }
});