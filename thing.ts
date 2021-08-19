namespace affine {
    let id_sequence = 0;

    export type ThingHandler = (comp: Thing) => void;

    export interface IKindable {
        kind: string;
    }

    export class Thing implements IKindable {
        private id_: number;
        private data_: any;

        get id() { return this.id_; }
        get data(): any {
            if (!this.data_) { this.data_ = {}; }
            return this.data_;
        }

        constructor(public kind: string) {
            this.id_ = id_sequence++;
        }

        /* virtual */ update() { }
        /* virtual */ draw() { }
    }
}
