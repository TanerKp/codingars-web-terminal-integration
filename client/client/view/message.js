export function messageView() {
    let container = document.createElement('div');
    container.classList.add('coding-ars-messages');
    container.controller = {};
    container.controller.show = (err, type) => {
        let message = document.createElement('div');
        let msg = document.createElement('div');
        let close = document.createElement('button');
        
        message.classList.add('coding-ars-message');
        msg.textContent = err;

        if(type) {
            message.classList.add(type);
        } else {
            message.classList.add('common');
        }

        window.setTimeout(() => message.classList.add('active'));
        let remover = window.setTimeout(() => remove(), 10000);

        let remove = () => {
            if(remover) {
                window.clearTimeout(remover);
                remover = undefined;
            }
            message.classList.remove('active');
            window.setTimeout(() => container.removeChild(message), 300);
        }

        close.addEventListener('click', remove);

        message.appendChild(msg);
        message.appendChild(close);
        container.appendChild(message);
    }
    return container;
}