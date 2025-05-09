import { collapsibleViewElement } from "./collapsible";
export function solutionViewElement() {
    let solutionContainer = document.createElement("div");
    solutionContainer.classList.add("coding-ars-solutions");

    let solutionContent = document.createElement("div");
    solutionContent.classList.add("coding-ars-solutions-content");
    solutionContainer.appendChild(solutionContent);

    let elements = {};

    solutionContainer.controller = {};
    solutionContainer.controller.show = (data) => {
        solutionContent.innerHTML = '';
        let count = 0;
        data.sort((a, b) => {
            if(a.thumbs > b.thumbs) return -1;
            if(a.thumbs < b.thumbs) return 1;
            if(a.time > b.time) return -1;
            if(a.time < b.time) return 1;
            return 0;
        })
        data.forEach(el => {
            let elementContainer = collapsibleViewElement();
            let d = new Date(el.time);
            elementContainer.controller.title(d.toLocaleDateString() + " " + d.toLocaleTimeString());

            solutionContainer.addEventListener('coding-ars-info-start-open', () => elementContainer.controller.close(), true);

            let sources = document.createElement('div');
            sources.classList.add('sources');
            (el.sources || []).forEach(source => {
                let pre = document.createElement('pre');
                let code = document.createElement('code');
                code.textContent = source.content;
                if((source.path || "").endsWith('.py')) {
                    code.classList.add('python');
                } else if((source.path || "").endsWith('.java')) {
                    code.classList.add('java');
                }
                pre.appendChild(code);
                sources.appendChild(pre);
                hljs.highlightBlock(code);
            });
            elementContainer.controller.appendToContent(sources);
            
            let buttons = document.createElement('div');
            buttons.classList.add('coding-ars-buttons');
            let thumbs = document.createElement('span');
            thumbs.textContent = el.thumbs ? el.thumbs + 'x' : '';
            let thumbUp = document.createElement('button');
            thumbUp.classList.add('up');
            if(el.thumbed) {
                thumbUp.classList.add('active');
            }
            thumbUp.addEventListener('click', _ => {
                let ev = new Event('coding-ars-thumb-up');
                ev.solutionRef = el.ref;
                solutionContainer.dispatchEvent(ev);
            })
            buttons.appendChild(thumbs);
            buttons.appendChild(thumbUp);
            elementContainer.controller.appendToContent(buttons);

            solutionContent.appendChild(elementContainer);

            elements[el.ref] = {
                thumbUp,
                thumbs
            }

            if(count < 1) {
                elementContainer.controller.toggle();
            }
            count ++;
        });
    };

    solutionContainer.controller.updateThumbs = (ref, thumbs, thumbed) => {
        if(!elements[ref]) {
            return;
        }
        if(thumbed) {
            elements[ref].thumbUp.classList.add('active');
        } else {
            elements[ref].thumbUp.classList.remove('active');
        }
        elements[ref].thumbs.textContent = thumbs ? thumbs + 'x' : '';
    }
    
    return solutionContainer;
}