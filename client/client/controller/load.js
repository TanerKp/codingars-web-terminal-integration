import { CodingArsService } from "../service/codingars";

export function loadController(url, key, task, token = undefined) {
    console.log("Start loading with joining task collection");

    CodingArsService.join(url, key).then(codingArs => {
        const loader = () => {
            console.log("Joined collection, create download link");
            var link = document.createElement("a");
            link.href = codingArs.loadUrl(task);
            document.body.appendChild(link);
            link.click();
            link.remove();
        }
        
        if(token) {
            Promise.resolve(token).then(res => {
                console.log(`Identify with token`);
                codingArs.identify(res).then(result => {
                    console.log(`identified with token`);
                    loader();
                }).catch(err => {
                    console.error(String(err));
                    loader();
                })
            }).catch(err => {
                console.error(String(err));
                loader();
            })
        } else {
            console.log(`No token, continue with starting app`);
            loader();
        }
    });
}