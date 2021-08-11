namespace affine {
    export interface EaseFrameOpts<T> {
        duration: number;
        startValue: T;
        endValue: T;
        relative?: boolean;
        curve: (a: number, b: number, t: number) => number;
        tag?: string;
    }

    export interface EaseFrameState<T> {
        startTimeMs?: number;
        startValue?: T;
        endValue?: T;
        currValue: T;
    }

    /**
     * An EaseFrame is a segment of an animation, describing how to interpolate from
     * start value to end value.
     */
    export interface EaseFrame<T> {
        state: EaseFrameState<T>;
        opts: EaseFrameOpts<T>;
        init(currValue: T): void;
        step(pctTime?: number): void;
    }

    export class EaseFrame_Float implements EaseFrame<number> {
        public state: EaseFrameState<number>;

        constructor(public opts: EaseFrameOpts<number>) {
            this.state = {
                currValue: this.opts.startValue
            };
        }

        public init(currValue: number) {
            const endValue = this.opts.endValue as number;
            if (currValue !== undefined && this.opts.relative) {
                this.state.startValue = currValue;
                this.state.endValue = currValue + endValue;
            } else {
                this.state.startValue = this.opts.startValue;
                this.state.endValue = this.opts.endValue;
            }
            this.state.currValue = this.state.startValue;
            this.state.startTimeMs = control.millis();
        }

        public step(pctTime?: number) {
            if (pctTime === undefined) {
                const currTimeMs = control.millis();
                const elapsedTimeMs = currTimeMs - this.state.startTimeMs;
                pctTime = elapsedTimeMs / (this.opts.duration * 1000);
            }
            this.state.currValue = this.opts.curve(this.state.startValue as number, this.state.endValue as number, pctTime);
        }
    }

    export class EaseFrame_Vec2 implements EaseFrame<Vec2> {
        public state: EaseFrameState<Vec2>;

        constructor(public opts: EaseFrameOpts<Vec2>) {
            this.opts.startValue = this.opts.startValue.clone();
            this.opts.endValue = this.opts.endValue.clone();
            this.state = {
                currValue: this.opts.startValue.clone()
            };
        }

        public init(currValue: Vec2) {
            const endValue = this.opts.endValue;
            const startValue = this.opts.startValue;
            if (currValue !== undefined && this.opts.relative) {
                this.state.startValue = currValue.clone();
                this.state.endValue = Vec2.AddToRef(currValue, endValue, new Vec2());
            } else {
                this.state.startValue = this.opts.startValue.clone();
                this.state.endValue = this.opts.endValue.clone();
            }
            this.state.currValue = this.state.startValue.clone();
        }

        public step(pctTime?: number) {
            if (pctTime === undefined) {
                const currTimeMs = control.millis();
                const elapsedTimeMs = currTimeMs - this.state.startTimeMs;
                pctTime = elapsedTimeMs / (this.opts.duration * 1000);
            }
            const startValue = this.state.startValue;
            const endValue = this.state.endValue;
            const currValue = this.state.currValue;
            currValue.x = Fx8(this.opts.curve(Fx.toFloat(startValue.x), Fx.toFloat(endValue.x), pctTime));
            currValue.y = Fx8(this.opts.curve(Fx.toFloat(startValue.y), Fx.toFloat(endValue.y), pctTime));
        }
    }

    /**
     * An Animation consists of an optionally looping set of contiguous EaseFrames.
     */
    export class Animation<T> {
        private frames: EaseFrame<T>[];
        private frameIdx: number;
        private loop: boolean;
        private playing_: boolean;

        public get playing() { return this.playing_; }

        constructor(private callback: (value: T, tag?: string) => void, opts?: {
            loop?: boolean
        }) {
            this.loop = opts && opts.loop;
            this.frames = [];
        }

        public addFrame(frame: EaseFrame<T>): this {
            this.frames.push(frame);
            return this;
        }

        public start(initialValue?: T) {
            this.frameIdx = 0;
            const currFrame = this.currFrame();
            if (currFrame) {
                this.playing_ = true;
                this.initFrame(initialValue);
            }
        }

        public stop() {
            this.playing_ = false;
        }

        public update() {
            if (this.playing) {
                this.stepFrame();
            }
        }

        private currFrame(): EaseFrame<T> {
            return this.frameIdx < this.frames.length ? this.frames[this.frameIdx] : undefined;
        }

        private stepFrame() {
            let lastValue: T;
            let currFrame = this.currFrame();
            if (!currFrame) { return; }
            const currTimeMs = control.millis();
            const diffSecs = (currTimeMs - currFrame.state.startTimeMs) / 1000;
            if (diffSecs >= currFrame.opts.duration) {
                // Final step for end value
                currFrame.step(1);
                this.callback(currFrame.state.currValue, currFrame.opts.tag);
                // Init next frame
                this.frameIdx += 1;
                lastValue = currFrame.state.currValue;
                this.initFrame(lastValue);
            }
            currFrame = this.currFrame();
            if (!currFrame) {
                if (this.loop) {
                    this.frameIdx = 0;
                    this.initFrame(lastValue);
                    currFrame = this.currFrame();
                }
            }
            if (currFrame) {
                currFrame.step();
                this.callback(currFrame.state.currValue, currFrame.opts.tag);
            } else {
                this.playing_ = false;
            }
        }

        private initFrame(initialValue?: T) {
            const currFrame = this.currFrame();
            if (currFrame) {
                currFrame.init(initialValue);
            }
        }
    }
}