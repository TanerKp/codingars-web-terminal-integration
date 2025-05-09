import { fixPath } from '../../utils/fixPath';
import { EditorService } from '../../service/editor';

export function editorViewElement(options) {
    const clientBase = fixPath(options.clientBase || "");
    const monacoBase = fixPath(options.monacoBase || ""); // e.g. _assets/vendor/vs

    let mainContainer = document.createElement("iframe");
    mainContainer.style.border = "none";
    mainContainer.style.overflow = "hidden";

    mainContainer.controller = {
        initiated: () => {
            let shadowDocument = mainContainer.contentDocument;
            return !!shadowDocument.getElementById('editor-container');
        },
        init: () => {
            return new Promise((resolve, reject) => {
                let shadowDocument = mainContainer.contentDocument.body;
                shadowDocument.style.overflow = 'hidden';
                const innerContainer = document.createElement('div');
                shadowDocument.appendChild(innerContainer);
                innerContainer.style.width = '100%';
                innerContainer.style.height = '100%';
                innerContainer.id = 'editor-container';
                innerContainer.setAttribute('data-monaco-base', monacoBase);
                // Note: In safari is currently an interaction btw. any element 
                //   loaded before css content from monaco. Thus, clean loading
                //   of editor.main.css and than add additional styles.
                // <link rel="stylesheet" href="styles.css"></link>
                const innerLink = document.createElement('link');
                innerLink.setAttribute('rel', 'stylesheet');
                innerLink.setAttribute('href', monacoBase + 'editor/editor.main.css');
                shadowDocument.appendChild(innerLink);
                innerLink.addEventListener('load', _ => {
                    const innerStyle = document.createElement('style');
                    innerStyle.innerText = 'body, html { margin: 0; }';
                    shadowDocument.appendChild(innerStyle);

                    // <script src="../node_modules/monaco-editor/min/vs/loader.js"></script>
                    const loaderScript = document.createElement('script');
                    loaderScript.setAttribute("src", monacoBase + "loader.js");
                    shadowDocument.appendChild(loaderScript)
                    loaderScript.addEventListener("load", _ => {
                        const mainScript = document.createElement('script');
                        mainScript.setAttribute("src", clientBase + "editor-controller.js");
                        shadowDocument.appendChild(mainScript);
                        mainScript.addEventListener("load", _ => {
                            let editorService = new EditorService(mainContainer.contentWindow);
                            editorService.prepare().then(() => {
                                resolve(editorService);
                            });
                        });
                    });
                });
            });
        }
    }

    return mainContainer;
};