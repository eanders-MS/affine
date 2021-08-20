namespace affine {
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

        public set(left: Fx8, top: Fx8, width: Fx8, height: Fx8) {
            this.left = left;
            this.top = top;
            this.width = width;
            this.height = height;
        }

        public minmax(min: Vec2, max: Vec2) {
            this.set(min.x, min.y, Fx.sub(max.x, min.x), Fx.sub(max.y, min.y))
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