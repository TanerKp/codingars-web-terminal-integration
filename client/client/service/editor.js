import { BroadcastService } from './broadcast.js';

export class EditorService {
    constructor(target) {
        this.broadcaster = new BroadcastService(target);
    }

    create(sources) {
        return this.broadcaster.send({ command: "create", sources });
    }

    switch(path) {
        return this.broadcaster.send({ command: "switch", path });
    }

    reset() {
        return this.broadcaster.send({ command: "reset" });
    }

    dispose() {
        return this.broadcaster.send({ command: "dispose" });
    }

    value() {
        return this.broadcaster.send({ command: "value" });
    }

    prepare() {
        return this.broadcaster.send({ command: "prepare" });
    }
}