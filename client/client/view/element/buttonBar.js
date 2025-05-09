import { loaderViewElement } from "./loader";

export function buttonBarViewElement() {
    const controllButtons = document.createElement('ul');
    controllButtons.classList.add('coding-ars-button-bar');
    controllButtons.controller = {};
    controllButtons.controller.addButton = (name, timeout) => {
        timeout = timeout || 2000;
        const button = document.createElement('li');
        if(name.endsWith('-icon')) {
            button.classList.add(name);
            button.classList.add('icon');
        } else {
            button.textContent = name;
        }
        button.classList.add('coding-ars-button-bar-element');
        button.appendChild(loaderViewElement());
        controllButtons.appendChild(button);
        let timer;
        button.controller = {
            wait: () => {
                button.controller.stopWait();
                button.controller.enable();
                timer = window.setTimeout(() => {
                    button.controller.stopWait();
                }, timeout)
                button.classList.add('wait');
            },
            hide: () => {
                button.style.display = 'none';
            },
            show: () => {
                button.style.display = '';
            },
            stopWait: () => {
                if(timer) {
                    window.clearTimeout(timer);
                }
                button.classList.remove('wait')
            },
            disable: () => {
                button.controller.stopWait();
                button.controller.enable();
                timer = window.setTimeout(() => {
                    button.controller.enable();
                }, timeout)
                button.classList.add('coding-ars-disabled');
            },
            enable: () => {
                button.classList.remove('coding-ars-disabled');
            },
            isEnabled: () => !button.classList.contains('coding-ars-disabled'),
            isWaiting: () => button.classList.contains('wait')
        };
        return button;
    }
    return controllButtons;
}