import { collectionView } from "../view/collection";
import { errorMessage } from "../utils/message";
import { translator } from "../language";

export function collectionController(target, codingArs, options) {
    const translate = translator(options.language);
    return new Promise((resolve, reject) => {
        let cv = collectionView(options);
        target.appendChild(cv);
    
        codingArs.collection().then(data => {
            resolve({
                dispose: () => {
                    console.log("dispose collection controller");
                    target.removeChild(cv);
                }
            })
            if(data.tasks && data.tasks.length == 1) {
                console.log("only one task found, disable selection and switch to task");
                let ev = new Event('coding-ars-start-task');
                ev.task = data.tasks[0].name;
                ev.singleTaskCollection = true;
                target.dispatchEvent(ev);
            } else {
                cv.controller.show(data);
            }
        }).catch(err => {
            console.log(String(err));
            console.log(err);
            target.dispatchEvent(errorMessage(translate('COULD_NOT_FIND_TASK_COLLECTION')));
        });
    });
}