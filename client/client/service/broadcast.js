let counter = 1;
/**
 * Manage listeners for request-response simulation
 * in Iframe communications.
 */
export class BroadcastService {
    constructor(target) {
        this.listeners = {};
        this.refIds = 1;
        this.target = target;
        this.counter = counter ++;

        let self = this;

        /**
         * Wait for messages in window, used to (bidirectional) 
         * communicated between iframes and main frame.
         */
        window.addEventListener('message', (event) => {
            let data = event.data;
            if(data && data.ref) {
                self.dispatch(data.ref, data);
            }
        });
    }
    
    dispatch(ref, data) {
        if (this.listeners[ref]) {
            this.listeners[ref](data);
        }
    }

    wait(ref) {
        return new Promise((resolve, reject) => {
            this.listeners[ref] = data => {
                resolve(data);
            };
        })
    }

    generateRefId() {
        return this.counter + "-" + this.refIds ++;
    }

    addRef(data) {
        data.ref = this.generateRefId()
        return data;
    }

    send(data) {
        data = this.addRef(data);
        this.target.postMessage(data, "*");
        return this.wait(data.ref);
    }
}