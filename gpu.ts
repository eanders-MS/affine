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
        frameId: number;
        public verts: Vertex[];
        public bounds: Bounds;
        pts: Vec2[];
        min: Vec2;
        max: Vec2;
        constructor(protected src: Vertex[]) {
            this.frameId = -1;
            this.verts = src.map(v => v.clone());
            this.pts = src.map(v => v.pos);
            this.min = new Vec2();
            this.max = new Vec2();
            this.bounds = Bounds.Zero();
        }
        protected calcBounds() {
            Vec2.MinOfToRef(this.pts, this.min);
            Vec2.MaxOfToRef(this.pts, this.max);
            this.bounds.from({ min: this.min, max: this.max });
        }
        /*abstract*/ transform(frameId: number, xfrm: Transform): void { }
    }

    export class BasicVertexShader extends VertexShader {
        public transform(frameId: number, xfrm: Transform): void {
            // Multiple DrawCommands can share a single set of vertices, so don't transform the verts more than once per frame.
            if (this.frameId === frameId) { return; }
            this.frameId = frameId;
            this.src.forEach((v, i) => xfrm.transformToRef(v.pos, this.verts[i].pos));
            this.calcBounds();
        }
    }

    export interface DrawCommand {
        bounds: Bounds;
        xfrm: Transform;
        vs: VertexShader;
        enqueue(): void;
        transform(frameId: number): void;
        shade(p: Vec2): number;
    }

    export class DrawTexturedTri implements DrawCommand {
        bounds: Bounds;
        public xfrm: Transform;
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
            public tri: number[],
            public tex: Image
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

        public transform(frameId: number): void {
            this.vs.transform(frameId, this.xfrm);
            this.area = Vec2.Cross(this.v0.pos, this.v1.pos, this.v2.pos);
            this.vArea.set(this.area, this.area);
            Vec2.MinOfToRef(this.pts, this.min);
            Vec2.MaxOfToRef(this.pts, this.max);
            this.bounds.from({ min: this.min, max: this.max });
        }

        // Hand-tuned threshold for shared edge of a split rectangle. Should
        // be Fx.zeroFx8 ideally, but that results in missing pixels.
        // Math issue?
        private static readonly V2V0_EDGE_FUDGE = Fx8(-20);

        public shade(/* const */p: Vec2): number {
            // Check barycentric coords. Is point in triangle?
            const w0 = Vec2.Cross(this.v1.pos, this.v2.pos, p);
            if (w0 < Fx.zeroFx8) return 0;
            const w1 = Vec2.Cross(this.v2.pos, this.v0.pos, p);
            if (w1 < DrawTexturedTri.V2V0_EDGE_FUDGE) return 0;
            const w2 = Vec2.Cross(this.v0.pos, this.v1.pos, p);
            if (w2 < Fx.zeroFx8) return 0;

            // Get uv coordinates at point.
            // TODO: Support different texture wrapping modes.
            Vec2.ScaleToRef(this.v0.uv, w0, this.uv0);
            Vec2.ScaleToRef(this.v1.uv, w1, this.uv1);
            Vec2.ScaleToRef(this.v2.uv, w2, this.uv2);
            Vec2.AddToRef(Vec2.AddToRef(this.uv0, this.uv1, this.uv), this.uv2, this.uv);
            Vec2.DivToRef(this.uv, this.vArea, this.uv);

            // Sample texture at uv.
            const u = Fx.toInt(Fx.mul(this.uv.u, Fx8(this.tex.width - 1)));
            const v = Fx.toInt(Fx.mul(this.uv.v, Fx8(this.tex.height - 1)));
            return this.tex.getPixel(u, v);
        }
    }

    export function exec() {
        ++frameId;
        // Run vertex shaders.
        for (let i = 0; i < commands.length; ++i) {
            const cmd = commands[i];
            cmd.transform(frameId);
        }
        // Run fragment shaders.
        for (let i = 0; i < commands.length; ++i) {
            const cmd = commands[i];
            // Get bounds of transformed vertices and clip to screen.
            const left = fx.clamp(cmd.bounds.left, Screen.SCREEN_LEFT_FX8, Screen.SCREEN_RIGHT_FX8);
            const top = fx.clamp(cmd.bounds.top, Screen.SCREEN_TOP_FX8, Screen.SCREEN_BOTTOM_FX8);
            const right = fx.clamp(Fx.add(cmd.bounds.left, cmd.bounds.width), Screen.SCREEN_LEFT_FX8, Screen.SCREEN_RIGHT_FX8);
            const bottom = fx.clamp(Fx.add(cmd.bounds.top, cmd.bounds.height), Screen.SCREEN_TOP_FX8, Screen.SCREEN_BOTTOM_FX8);
            // Loop over bounded pixels, rendering them.
            const p = new Vec2(left, top);
            for (; p.y <= bottom; p.y = Fx.add(p.y, Fx.oneFx8)) {
                const yi = Fx.toInt(p.y) + Screen.SCREEN_HALF_HEIGHT;
                p.x = left;
                for (; p.x <= right; p.x = Fx.add(p.x, Fx.oneFx8)) {
                    // Returns zero if p is outside the poly.
                    const color = cmd.shade(p);
                    if (color) {
                        screen.setPixel(
                            Fx.toInt(p.x) + Screen.SCREEN_HALF_WIDTH,
                            yi,
                            color);
                    }
                }
            }
        }
        commands = [];
    }
}