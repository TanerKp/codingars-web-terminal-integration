export function collapsibleViewElement() {
    let box = document.createElement("div");
    box.classList.add('coding-ars-info-box');

    let button = document.createElement("button");
    button.classList.add("coding-ars-info-collapsible");
    button.addEventListener('click', () => box.controller.toggle());
    box.appendChild(button);

    let content = document.createElement("div");
    content.classList.add("coding-ars-info-content");
    box.appendChild(content);

    box.controller = {
        appendToContent: (el) => content.appendChild(el),
        textContent: (text) => content.innerHTML = text,
        title: (text) => button.textContent = text,
        toggle: () => {
            if (button.classList.contains("coding-ars-disabled")) {
                return false;
            }
            if (content.style.maxHeight) {
                box.controller.close();
            } else {
                box.controller.open();
            }
        },
        fixContent: () => {
            content.style.maxHeight = content.scrollHeight + "px";
        },
        open: () => {
            box.dispatchEvent(new Event('coding-ars-info-start-open'));
            button.classList.add('coding-ars-info-active');
            content.style.maxHeight = content.scrollHeight + "px";
        },
        close: () => {
            button.classList.remove('coding-ars-info-active');
            content.style.maxHeight = null;
        },
        disable: () => {
            button.classList.add("coding-ars-disabled")
        },
        enable: () => {
            button.classList.remove("coding-ars-disabled")
        },
        good: () => {
            button.classList.remove("wrong", "neutral")
            button.classList.add("done")
        },
        bad: () => {
            button.classList.remove("done", "neutral")
            button.classList.add("wrong")
        },
        neutral: () => {
            button.classList.remove("done", "wrong")
            button.classList.add("neutral")
        },
        activate: () => {
            box.controller.enable();
            if(button.classList.contains("coding-ars-info-active")) {
                box.controller.toggle();
            }
            box.controller.toggle();
        }
    };

    return box;
}