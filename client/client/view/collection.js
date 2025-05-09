import { collapsibleViewElement } from "./element/collapsible";
import { translator } from "../language";

let lastTask = undefined;

export function collectionView(options) {
    const translate = translator(options.language);
    let container = document.createElement('div');
    container.classList.add('coding-ars-task-selection');
    let tasks = [];
    container.addEventListener('coding-ars-info-start-open', () => tasks.forEach(el => el.controller.close()), true);
    container.controller = {
        show: (data) => {
            let firstNotTested = false;
            (data.tasks || []).forEach(el => {
                if(!el.title) {
                    return;
                }
                let task = collapsibleViewElement();
                tasks.push(task);
                task.controller.title(el.title)
                el.description = el.description || "";
                task.controller.textContent(marked ? marked.parse(el.description) : el.description)

                let buttons = document.createElement('div');
                buttons.classList.add('coding-ars-buttons');
                let start = document.createElement('button');
                start.textContent = translate("START");
                start.classList.add('active');
                start.addEventListener('click', _ => {
                    let ev = new Event('coding-ars-start-task');
                    ev.task = el.name;
                    container.dispatchEvent(ev);
                })
                buttons.appendChild(start);
                task.controller.appendToContent(buttons);

                container.appendChild(task);

                if(el.testsOk) {
                    task.controller.good();
                } else {
                    if(!firstNotTested) {
                        task.controller.open();
                        firstNotTested = el.name;
                    }
                    if(el.name == lastTask) {
                        task.controller.open();
                        firstNotTested = el.name;
                    }
                }

                // Need to be done after
                task.addEventListener('coding-ars-info-start-open', () => lastTask = el.name);
            })
        }
    };
    return container;
}