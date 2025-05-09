export function commonMessage(msg) {
    let ev = new Event('coding-ars-common');
    ev.msg = msg;
    return ev;
}
export function errorMessage(msg) {
    let ev = new Event('coding-ars-error');
    ev.msg = msg;
    return ev;
}
export function successMessage(msg) {
    let ev = new Event('coding-ars-success');
    ev.msg = msg;
    return ev;
}