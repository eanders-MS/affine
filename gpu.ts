namespace affine {
    export class Vertex {
        // TODO: Support different vertex formats
        private pos_: Vec2;
        private uv_: Vec2;

        public get pos() { return this.pos_; }
        public set pos(v) { this.pos_.copyFrom(v); }
        public get uv() { return this.uv_; }
        public set uv(v) { this.uv_.copyFrom(v); }

        constructor(pos: Vec2 = null, uv: Vec2 = null, ref = false) {
            this.pos_ = pos ? ref ? pos : pos.clone() : new Vec2();
            this.uv_ = uv ? ref ? uv : uv.clone() : new Vec2();
        }

        public clone(): Vertex {
            return new Vertex(this.pos, this.uv);
        }
    }
}

namespace affine.Gpu {
    let frameId = 0;
    let commands: DrawCommand[] = [];

    export class VertexShader {
        public frameId: number;
        public verts: Vertex[];
        public bounds: Bounds;
        pts: Vec2[];
        min: Vec2;
        max: Vec2;

        constructor(protected src: Vertex[]) {
            this.frameId = -1;
            this.verts = src.map(v => v.clone());
            this.pts = this.verts.map(v => v.pos);
            this.min = new Vec2();
            this.max = new Vec2();
            this.bounds = Bounds.Zero();
        }

        public calcBounds() {
            Vec2.MinOfToRef(this.pts, this.min);
            Vec2.MaxOfToRef(this.pts, this.max);
            this.bounds.from({ min: this.min, max: this.max });
        }

        /*abstract*/ transform(index: number, xfrm: Transform): void { }

        public exec(xfrm: Transform) {
            for (let i = 0; i < this.src.length; ++i) {
                this.transform(i, xfrm);
            }
            this.calcBounds();
        }
    }

    export class BasicVertexShader extends VertexShader {
        public transform(index: number, xfrm: Transform): void {
            const src = this.src[index];
            const dst = this.verts[index];
            xfrm.transformToRef(src.pos, dst.pos);
        }
    }

    export class PixelShader {
        constructor() { }
        /**
         * @p the screen space pixel coordinate
         * @uv the texture coordinates at p
         * @returns color index for pixel
         */
        /*abstract*/ shade(p: Vec2, uv: Vec2): number { return 0; }
    }

    export class TexturedPixelShader extends PixelShader {
        // TODO: Support texture wrapping modes
        texWidth: Fx8;
        texHeight: Fx8;
        constructor(protected tex: Image) {
            super();
            this.texWidth = Fx8(this.tex.width - 1);
            this.texHeight = Fx8(this.tex.height - 1);
        }
        shade(p: Vec2, uv: Vec2): number {
            // Sample texture at uv.
            const x = Fx.toInt(Fx.mul(uv.u, this.texWidth));
            const y = Fx.toInt(Fx.mul(uv.v, this.texHeight));
            return this.tex.getPixel(x, y);
        }
    }

    // Hand-tuned threshold for shared edge of a split rectangle. Should
    // be Fx.zeroFx8 ideally, but that results in missing pixels.
    // Math issue?
    const V2V0_EDGE_FUDGE = Fx8(-20);
    const V1V2_EDGE_FUDGE = Fx8(-10);
    const V0V1_EDGE_FUDGE = Fx8(-5);

    export class DrawCommand {
        public bounds: Bounds;
        public xfrm: Transform;
        public debug: boolean;
        // Cached and computed values
        private area: Fx8;
        private vArea: Vec2;
        private v0: Vertex;
        private v1: Vertex;
        private v2: Vertex;
        private pts: Vec2[];
        // Temp vars
        private min: Vec2;
        private max: Vec2;
        private uv0: Vec2;
        private uv1: Vec2;
        private uv2: Vec2;
        private uv: Vec2;

        constructor(
            public vs: VertexShader,
            public ps: PixelShader,
            public tri: number[]
        ) {
            this.bounds = Bounds.Zero();
            this.v0 = this.vs.verts[this.tri[0]];
            this.v1 = this.vs.verts[this.tri[1]];
            this.v2 = this.vs.verts[this.tri[2]];
            this.pts = [this.v0.pos, this.v1.pos, this.v2.pos];
            this.vArea = new Vec2();
            this.min = new Vec2();
            this.max = new Vec2();
            this.uv0 = new Vec2();
            this.uv1 = new Vec2();
            this.uv2 = new Vec2();
            this.uv = new Vec2();
        }

        public enqueue() {
            if (this.area == Fx.zeroFx8) return;
            commands.push(this);
        }

        public execVs(frameId: number): void {
            if (this.vs.frameId !== frameId) {
                this.vs.frameId = frameId;
                this.vs.exec(this.xfrm);
            }
            this.area = Vec2.Edge(this.v0.pos, this.v1.pos, this.v2.pos);
            this.vArea.set(this.area, this.area);
            Vec2.MinOfToRef(this.pts, this.min);
            Vec2.MaxOfToRef(this.pts, this.max);
            this.bounds.from({ min: this.min, max: this.max });
        }

        public execPs(): void {
            // Get bounds of transformed vertices and clip to screen.
            const left = fx.clamp(this.bounds.left, Screen.SCREEN_LEFT_FX8, Screen.SCREEN_RIGHT_FX8);
            const top = fx.clamp(this.bounds.top, Screen.SCREEN_TOP_FX8, Screen.SCREEN_BOTTOM_FX8);
            const right = fx.clamp(Fx.add(this.bounds.left, this.bounds.width), Screen.SCREEN_LEFT_FX8, Screen.SCREEN_RIGHT_FX8);
            const bottom = fx.clamp(Fx.add(this.bounds.top, this.bounds.height), Screen.SCREEN_TOP_FX8, Screen.SCREEN_BOTTOM_FX8);
            const p = new Vec2(left, top);
            // Loop over bounded pixels, rendering them.
            for (; p.y <= bottom; p.y = Fx.add(p.y, Fx.oneFx8)) {
                const yi = Fx.toInt(p.y) + Screen.SCREEN_HALF_HEIGHT;
                p.x = left;
                for (; p.x <= right; p.x = Fx.add(p.x, Fx.oneFx8)) {
                    const w0 = Vec2.Edge(this.v1.pos, this.v2.pos, p);
                    const w1 = Vec2.Edge(this.v2.pos, this.v0.pos, p);
                    const w2 = Vec2.Edge(this.v0.pos, this.v1.pos, p);
                    if (w0 >= V1V2_EDGE_FUDGE && w1 >= V2V0_EDGE_FUDGE && w2 >= V0V1_EDGE_FUDGE) {
                        const color = this.shade(w0, w1, w2, p);
                        if (color) {
                            const xi = Fx.toInt(p.x) + Screen.SCREEN_HALF_WIDTH;
                            screen.setPixel(xi, yi, color);
                        }
                    }
                }
            }
            if (this.debug) { this.debugDraw(left, top, right, bottom); }
        }

        public debugDraw(left: Fx8, top: Fx8, right: Fx8, bottom: Fx8) {
            const p0 = Vec2.AddToRef(this.v0.pos, Screen.SCREEN_HALF_SIZE, new Vec2());
            const p1 = Vec2.AddToRef(this.v1.pos, Screen.SCREEN_HALF_SIZE, new Vec2());
            const p2 = Vec2.AddToRef(this.v2.pos, Screen.SCREEN_HALF_SIZE, new Vec2());
            affine.drawLine(screen, p0, p1, 15);
            affine.drawLine(screen, p1, p2, 15);
            affine.drawLine(screen, p2, p0, 15);
        }

        public shade(w0: Fx8, w1: Fx8, w2: Fx8, /* const */p: Vec2): number {
            // Get uv coordinates at barycentric point
            // TODO: Support different texture wrapping modes.
            Vec2.ScaleToRef(this.v0.uv, w0, this.uv0);
            Vec2.ScaleToRef(this.v1.uv, w1, this.uv1);
            Vec2.ScaleToRef(this.v2.uv, w2, this.uv2);
            Vec2.AddToRef(Vec2.AddToRef(this.uv0, this.uv1, this.uv), this.uv2, this.uv);
            Vec2.DivToRef(this.uv, this.vArea, this.uv);

            return this.ps.shade(p, this.uv);
        }
    }

    export function exec() {
        ++frameId;
        // Run vertex shaders.
        for (let i = 0; i < commands.length; ++i) {
            const cmd = commands[i];
            cmd.execVs(frameId);
        }
        // Run pixel shaders.
        for (let i = 0; i < commands.length; ++i) {
            const cmd = commands[i];
            cmd.execPs();
        }
        commands = [];
    }
}