import { errorMessage } from "../utils/message";
import { translator } from "../language";

export function keyView(options) {
    const translate = translator(options.language);
    let container = document.createElement('div');
    container.classList.add('coding-ars-form');
    
    let input = document.createElement('input');
    let button = document.createElement('button');

    button.classList.add('coding-ars-primary');
    button.textContent = translate("JOIN");
    input.value = window.defaultKey || "";

    button.addEventListener('click', () => {
        let key = input.value;
        if(key) {
            let keyEvent = new Event('coding-ars-key');
            keyEvent.key = key;
            container.dispatchEvent(keyEvent);
        } else {
            container.dispatchEvent(errorMessage(translate('NO_KEY_PROVIDED')));
        }
    })

    container.appendChild(input);
    container.appendChild(button);

    return container;
}