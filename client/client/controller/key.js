import { keyView } from "../view/key";

export function keyController(target, options) {
    return new Promise((resolve, reject) => {
        let kv = keyView(options);
        target.appendChild(kv);
        resolve({
            dispose: () => {
                console.log("dispose key form controller");
                target.removeChild(kv);
            }
        })
    });
}