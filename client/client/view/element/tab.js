import { loaderViewElement } from "./loader";
import { buttonBarViewElement } from "./buttonBar";

export function tabViewElement() {
    // one line mode -> collabsed, nothing visible, only button line
    // open mode -> when tab is selected
    // allows to add tabs and buttons
    // buttons are placed on right side
    // collabses, when current tab is selected once more

    const container = document.createElement('div');
    const controllButtons = buttonBarViewElement();
    const tabButtons = document.createElement('ul');
    const tabs = document.createElement('div');
    const state = document.createElement('div');

    container.classList.add('coding-ars-tabs-container');
    tabButtons.classList.add('coding-ars-tabs-buttons');
    controllButtons.classList.add('coding-ars-tabs-controller-buttons');
    tabs.classList.add('coding-ars-tabs-content');

    container.appendChild(tabButtons);
    container.appendChild(controllButtons);
    container.appendChild(tabs);
    container.appendChild(state);

    state.classList.add('coding-ars-tabs-state');
    state.style.display = 'none';

    container.controller = {};
    container.controller.addButton = controllButtons.controller.addButton;
    container.controller.STATE_SUCCESS = "coding-ars-tabs-state-success";
    container.controller.STATE_FAILED = "coding-ars-tabs-state-failed";
    container.controller.STATE_NEUTRAL = "coding-ars-tabs-state-neutral";
    container.controller.setState = (text, style = "") => {
        state.innerHTML = `<span>${text}</span>`;
        state.classList.remove(container.controller.STATE_SUCCESS);
        state.classList.remove(container.controller.STATE_FAILED);
        state.classList.remove(container.controller.STATE_NEUTRAL);
        state.classList.add(style || container.controller.STATE_NEUTRAL);
        state.style.display = '';
    };
    container.controller.hideState = () => {
        state.style.display = 'none';
    };
    container.controller.addTab = (name) => {
        const tab = document.createElement('div');
        tab.classList.add('coding-ars-tabs-entry');

        const tabButton = document.createElement('li');
        tabButton.textContent = name;

        tabs.appendChild(tab);
        tabButtons.appendChild(tabButton);

        const activate = () => {
            let wasActive = tab.classList.contains('active');
            for(let i = 0; i < tabs.childNodes.length; i ++) {
                tabs.childNodes[i].classList.remove('active');
            }
            for(let i = 0; i < tabButtons.childNodes.length; i ++) {
                tabButtons.childNodes[i].classList.remove('active');
            }
            if(!wasActive) {
                tab.classList.add('active');
                tabButton.classList.add('active');
                tab.dispatchEvent(new Event('coding-ars-tab-view-active'));
            } else {
                tab.dispatchEvent(new Event('coding-ars-tab-view-inactive'));
            }
        };

        tabButton.addEventListener('click', activate)

        tab.controller = {
            replaceContent: (content) => {
                tab.innerHTML = "";
                tab.appendChild(content);
            },
            appendContent: (content) => {
                tab.appendChild(content);
            },
            replaceContentWithText: (text) => {
                tab.innerHTML = "";
                tab.textContent = text;
            },
            hide: () => {
                tabButton.style.display = 'none';
            },
            show: () => {
                tabButton.style.display = '';
            },
            activate: () => {
                if(!tab.classList.contains('active')) {
                    activate();
                }
            }
        };

        return tab;
    }
    
    return container;
}