namespace affine {
    /**
     * An EaseFrame is a segment of an animation, describing how to interpolate from
     * start value to end value.
     */
    export class EaseFrame {
        // Interpolation state -- mutable
        public state: {
            startTimeMs?: number;
            startValue?: number | Vec2;
            endValue?: number | Vec2;
            currValue: number | Vec2;
        };

        constructor(
            // Interpolation params -- read only
            public opts: {
                // Duration of this frame
                duration: number,
                // Starting value
                startValue: number | Vec2,
                // Ending value
                endValue: number | Vec2,
                // Whether values are relative to previous frame's end (or initial value)
                relative?: boolean,
                // Curve to follow (see easing.ts for pre-defined curves)
                curve: (a: number, b: number, t: number) => number,
                // User-assigned value
                tag?: string
            }) {
            if ((this.opts.endValue as any).x !== undefined) {
                // Vec2
                this.opts.startValue = (this.opts.startValue as Vec2).clone();
                this.opts.endValue = (this.opts.endValue as Vec2).clone();
                this.state = {
                    currValue: (this.opts.startValue as Vec2).clone()
                };
            } else {
                // number
                this.state = {
                    currValue: this.opts.startValue
                };
            }
        }

        public init(currValue: number | Vec2) {
            if ((this.opts.endValue as any).x !== undefined) {
                // Vec2
                currValue = currValue as Vec2;
                const endValue = this.opts.endValue as Vec2;
                const startValue = this.opts.startValue as Vec2;
                if (currValue !== undefined && this.opts.relative) {
                    this.state.startValue = currValue.clone();
                    this.state.endValue = Vec2.AddToRef(currValue, endValue, new Vec2());
                } else {
                    this.state.startValue = (this.opts.startValue as Vec2).clone();
                    this.state.endValue = (this.opts.endValue as Vec2).clone();
                }
                this.state.currValue = this.state.startValue.clone();
            } else {
                // number
                currValue = currValue as number;
                const endValue = this.opts.endValue as number;
                if (currValue !== undefined && this.opts.relative) {
                    this.state.startValue = currValue;
                    this.state.endValue = currValue + endValue;
                } else {
                    this.state.startValue = this.opts.startValue;
                    this.state.endValue = this.opts.endValue;
                }
                this.state.currValue = this.state.startValue;
            }
            this.state.startTimeMs = control.millis();
        }

        public step(pctTime?: number) {
            if (pctTime === undefined) {
                const currTimeMs = control.millis();
                const elapsedTimeMs = currTimeMs - this.state.startTimeMs;
                pctTime = elapsedTimeMs / (this.opts.duration * 1000);
            }
            if ((this.opts.endValue as any).x !== undefined) {
                // Vec2
                const startValue = this.state.startValue as Vec2;
                const endValue = this.state.endValue as Vec2;
                const currValue = this.state.currValue as Vec2;
                currValue.x = Fx8(this.opts.curve(Fx.toFloat(startValue.x), Fx.toFloat(endValue.x), pctTime));
                currValue.y = Fx8(this.opts.curve(Fx.toFloat(startValue.y), Fx.toFloat(endValue.y), pctTime));
            } else {
                // number
                this.state.currValue = this.opts.curve(this.state.startValue as number, this.state.endValue as number, pctTime);
            }
        }
    }

    /**
     * An Animation consists of an optionally looping set of contiguous EaseFrames.
     */
    export class Animation {
        private frames: EaseFrame[];
        private frameIdx: number;
        private loop: boolean;
        private playing_: boolean;

        public get playing() { return this.playing_; }

        constructor(private callback: (value: number | Vec2, tag?: string) => void, opts?: {
            loop?: boolean
        }) {
            this.loop = opts && opts.loop;
            this.frames = [];
        }

        public addFrame(frame: EaseFrame): this {
            this.frames.push(frame);
            return this;
        }

        public start(initialValue?: number) {
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

        private currFrame(): EaseFrame {
            return this.frameIdx < this.frames.length ? this.frames[this.frameIdx] : undefined;
        }

        private stepFrame() {
            let lastValue: number | Vec2;
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

        private initFrame(initialValue?: number | Vec2) {
            const currFrame = this.currFrame();
            if (currFrame) {
                currFrame.init(initialValue);
            }
        }
    }
}