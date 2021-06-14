namespace affine {
    // NOTE: `type`s are _VERY SLOW_ in STS.
    // TODO: Change it to not use `type`.
    export type BoundsInit = {
        // option 1
        left?: Fx8;
        top?: Fx8;
        width?: Fx8
        height?: Fx8
        // option 2
        min?: Vec2;
        max?: Vec2;
    };

    export class Bounds {
        constructor(
            public left: Fx8,
            public top: Fx8,
            public width: Fx8,
            public height: Fx8
        ) { }
        public static Zero() {
            return new Bounds(Fx.zeroFx8, Fx.zeroFx8, Fx.zeroFx8, Fx.zeroFx8);
        }
        public static Create(p: BoundsInit): Bounds {
            const bounds = Bounds.Zero();
            return bounds.from(p);
        }

        public from(p: BoundsInit): this {
            if (p.left != null) {
                this.left = p.left;
                this.top = p.top;
                this.width = p.width;
                this.height = p.height;
            } else if (p.min) {
                this.left = p.min.x;
                this.top = p.min.y;
                this.width = Fx.sub(p.max.x, p.min.x);
                this.height = Fx.sub(p.max.y, p.min.y);
            }
            return this;
        }

        public contains(p: Vec2): boolean {
            return (
                (p.x >= this.left) &&
                (p.y >= this.top) &&
                (p.x <= Fx.add(this.left, this.width)) &&
                (p.y <= Fx.add(this.top, this.height))
            );
        }
    }
}