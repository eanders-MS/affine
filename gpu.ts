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
            this.bounds.minmax(this.min, this.max);
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

    function pointInTri(p0: Vec2, p1: Vec2, p2: Vec2, p: Vec2, fudge: Fx8): boolean {
        const w0 = Vec2.Edge(p1, p2, p);
        if (w0 < fudge) return false;
        const w1 = Vec2.Edge(p2, p0, p);
        if (w1 < fudge) return false;
        const w2 = Vec2.Edge(p0, p1, p);
        if (w2 < fudge) return false;
        return true;
    }

    function barycentric(p0: Vec2, p1: Vec2, p2: Vec2, p: Vec2, out: Vec3, fudge: Fx8): boolean {
        const w0 = Vec2.Edge(p1, p2, p);
        if (w0 < fudge) return false;
        const w1 = Vec2.Edge(p2, p0, p);
        if (w1 < fudge) return false;
        const w2 = Vec2.Edge(p0, p1, p);
        if (w2 < fudge) return false;
        out.x = w0;
        out.y = w1;
        out.z = w2;
        return true;
    }

    export class DrawCommand {
        public bounds: Bounds;
        public xfrm: Transform;
        public debug: boolean;
        public debugColor: number;
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
        private gbounds: Bounds;
        private cbounds: Bounds;

        constructor(
            public vs: VertexShader,
            public ps: PixelShader,
            public tri: number[]
        ) {
            this.debug = false;
            this.debugColor = 15;
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
            this.gbounds = Bounds.Zero();
            this.cbounds = Bounds.Zero();
        }

        public enqueue() {
            if (this.area == Fx.zeroFx8) return;
            commands.push(this);
        }

        public execVs(frameId: number): void {
            if (this.vs.frameId !== frameId) {
                this.vs.frameId = frameId;
                this.vs.exec(this.xfrm);
                //this.debugDrawBounds(this.vs.bounds, 3);
            }
            this.area = Vec2.Edge(this.v0.pos, this.v1.pos, this.v2.pos);
            this.vArea.set(this.area, this.area);
            Vec2.MinOfToRef(this.pts, this.min);
            Vec2.MaxOfToRef(this.pts, this.max);
            this.bounds.minmax(this.min, this.max);
            //this.debugDrawBounds(this.bounds, 1);
        }

        public execPs(): void {
            // Get bounds of transformed vertices and clip to screen.
            this.gbounds.left = fx.clamp(this.bounds.left, Screen.SCREEN_LEFT_FX8, Screen.SCREEN_RIGHT_FX8);
            this.gbounds.top = fx.clamp(this.bounds.top, Screen.SCREEN_TOP_FX8, Screen.SCREEN_BOTTOM_FX8);
            this.gbounds.right = fx.clamp(this.bounds.right, Screen.SCREEN_LEFT_FX8, Screen.SCREEN_RIGHT_FX8);
            this.gbounds.bottom = fx.clamp(this.bounds.bottom, Screen.SCREEN_TOP_FX8, Screen.SCREEN_BOTTOM_FX8);
            const broadphaseSize = Fx.max(Fx.oneFx8, fx.floor(Fx.div(this.gbounds.min, Fx8(4))));
            const fudge = Fx.neg(Fx.mul(broadphaseSize, Fx8(2)));
            //const fudge = Fx.zeroFx8; // ideally...
            if (broadphaseSize < Fx8(4)) {
                // Broadphase not worth the cost at small scale
                this.psInner(this.gbounds, fudge);
            } else {
                // Broadphase filter and render
                const p0 = this.v0.pos;
                const p1 = this.v1.pos;
                const p2 = this.v2.pos;
                const tl = new Vec2();
                const tr = new Vec2();
                const bl = new Vec2();
                const br = new Vec2();
                for (let y = this.gbounds.top; y < this.gbounds.bottom; y = Fx.add(y, broadphaseSize)) {
                    this.cbounds.top = y;
                    this.cbounds.height = broadphaseSize;
                    if (this.cbounds.bottom > this.gbounds.bottom) { this.cbounds.bottom = this.gbounds.bottom; }
                    let drawn = false;
                    for (let x = this.gbounds.left; x < this.gbounds.right; x = Fx.add(x, broadphaseSize)) {
                        this.cbounds.left = x;
                        this.cbounds.width = broadphaseSize;
                        if (this.cbounds.right > this.gbounds.right) { this.cbounds.right = this.gbounds.right; }
                        // If the filter box is too small, don't try to filter
                        const tinyPhase = this.cbounds.max < Fx8(4);
                        // Filter box in triangle?
                        const inTri = tinyPhase ||
                            pointInTri(p0, p1, p2, tl.set(this.cbounds.left, this.cbounds.top), fudge) ||
                            pointInTri(p0, p1, p2, tr.set(this.cbounds.right, this.cbounds.top), fudge) ||
                            pointInTri(p0, p1, p2, bl.set(this.cbounds.left, this.cbounds.bottom), fudge) ||
                            pointInTri(p0, p1, p2, br.set(this.cbounds.right, this.cbounds.bottom), fudge);
                        // Triangle vertex in filter box?
                        const inside =
                            inTri ||
                            this.cbounds.contains(p0) ||
                            this.cbounds.contains(p1) ||
                            this.cbounds.contains(p2);
                        if (inside) {
                            drawn = true;
                            this.psInner(this.cbounds, fudge);
                            //this.debugDrawBounds(this.cbounds, 16 - this.debugColor);
                        } else {
                            if (drawn) { break; }
                            //this.psInner(this.cbounds, fudge, 15);
                            //this.debugDrawBounds(this.cbounds, this.debugColor);
                        }
                    }
                }
            }
            if (this.debug) { this.debugDrawVerts(this.debugColor); }
            //if (this.debug) { this.debugDrawBox(gleft, gtop, gright, gbottom, 1); }
        }

        private psInner(bounds: Bounds, fudge: Fx8, colorOverride?: number) {
            const p0 = this.v0.pos;
            const p1 = this.v1.pos;
            const p2 = this.v2.pos;
            const p = new Vec2(bounds.left, bounds.top);
            const bary = new Vec3();
            // Loop over bounded pixels, rendering them.
            for (; p.y <= bounds.bottom; p.y = Fx.add(p.y, Fx.oneFx8)) {
                const yi = Fx.toInt(p.y) + Screen.SCREEN_HALF_HEIGHT;
                p.x = bounds.left;
                for (; p.x <= bounds.right; p.x = Fx.add(p.x, Fx.oneFx8)) {
                    if (barycentric(p0, p1, p2, p, bary, fudge)) {
                        let color = this.shade(bary.x, bary.y, bary.z, p);
                        if (color) {
                            color = colorOverride ? colorOverride : color;
                            const xi = Fx.toInt(p.x) + Screen.SCREEN_HALF_WIDTH;
                            screen.setPixel(xi, yi, color);
                        }
                    }
                }
            }
        }

        public debugDrawBounds(bounds: Bounds, color: number) {
            this.debugDrawBox(
                bounds.left,
                bounds.top,
                Fx.add(bounds.left, bounds.width),
                Fx.add(bounds.top, bounds.height),
                color);
        }

        public debugDrawBox(left: Fx8, top: Fx8, right: Fx8, bottom: Fx8, color: number) {
            left = Fx.add(left, Screen.SCREEN_HALF_WIDTH_FX8);
            top = Fx.add(top, Screen.SCREEN_HALF_HEIGHT_FX8);
            right = Fx.add(right, Screen.SCREEN_HALF_WIDTH_FX8);
            bottom = Fx.add(bottom, Screen.SCREEN_HALF_HEIGHT_FX8);
            drawLine(screen, left, top, right, top, color);
            drawLine(screen, right, top, right, bottom, color);
            drawLine(screen, right, bottom, left, bottom, color);
            drawLine(screen, left, bottom, left, top, color);
        }

        public debugDrawVerts(color: number) {
            const p0 = Vec2.AddToRef(this.v0.pos, Screen.SCREEN_HALF_SIZE, new Vec2());
            const p1 = Vec2.AddToRef(this.v1.pos, Screen.SCREEN_HALF_SIZE, new Vec2());
            const p2 = Vec2.AddToRef(this.v2.pos, Screen.SCREEN_HALF_SIZE, new Vec2());
            drawLineFromPts(screen, p0, p1, color);
            drawLineFromPts(screen, p1, p2, color);
            drawLineFromPts(screen, p2, p0, color);
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