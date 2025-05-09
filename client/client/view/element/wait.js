import { loaderViewElement } from "./loader";

export function waitViewElement() {
    let waiter = document.createElement("div");
    waiter.classList.add("coding-ars-wait");
    waiter.appendChild(loaderViewElement())

    return waiter;
}