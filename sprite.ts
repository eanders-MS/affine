namespace affine {

    export interface IPlaceable {
        xfrm: Transform;
    }

    export interface ISizable {
        width: Fx8;
        height: Fx8;
    }
    
    export /*abstract*/ class Sprite implements IPlaceable, ISizable {
        private xfrm_: Transform;

        /* abstract */ get width(): Fx8 { return Fx.zeroFx8; }
        /* abstract */ get height(): Fx8 { return Fx.zeroFx8; }

        public get xfrm() { return this.xfrm_; }

        constructor(public scene: Scene) {
            this.xfrm_ = new Transform();
            this.xfrm_.parent = scene.xfrm;
        }

        /*abstract*/ update(dt: number): void { }
        /*abstract*/ draw(): void { }
    }

    const SPRITE_TRI0_INDICES = [0, 3, 2];
    const SPRITE_TRI1_INDICES = [2, 1, 0];

    /**
     * Quad layout:
     * (i:0,uv:0,0) (i:1,uv:1,0)
     *   +------------+
     *   |\__         |
     *   |   \__      |
     *   |      \__   |
     *   |         \__|
     *   +------------+
     * (i:3,uv:0,1) (i:2,uv:1,1)
     */

    export class QuadSprite extends Sprite {
        verts: Vertex[];
        vs: Gpu.VertexShader;
        ps: Gpu.PixelShader;
        tri0: Gpu.DrawCommand;
        tri1: Gpu.DrawCommand;

        public get width() { return this.vs.bounds.width; }
        public get height() { return this.vs.bounds.height; }

        constructor(
            scene: Scene,
            width: number,
            height: number,
            vs: (src: Vertex[]) => Gpu.VertexShader,
            ps: () => Gpu.PixelShader) {
            super(scene);
            const left = Fx8(-(width >> 1));
            const right = Fx8(width >> 1);
            const top = Fx8(-(height >> 1));
            const bottom = Fx8(height >> 1);
            const pts = [
                new Vec2(left, top),
                new Vec2(right, top),
                new Vec2(right, bottom),
                new Vec2(left, bottom),
            ];
            const uvs = [
                new Vec2(Fx.zeroFx8, Fx.zeroFx8),
                new Vec2(Fx.oneFx8, Fx.zeroFx8),
                new Vec2(Fx.oneFx8, Fx.oneFx8),
                new Vec2(Fx.zeroFx8, Fx.oneFx8),
            ];
            this.verts = [
                new Vertex(pts[0], uvs[0], true),
                new Vertex(pts[1], uvs[1], true),
                new Vertex(pts[2], uvs[2], true),
                new Vertex(pts[3], uvs[3], true),
            ];
            this.vs = vs(this.verts);
            this.ps = ps();
            this.tri0 = new Gpu.DrawCommand(this.vs, this.ps, SPRITE_TRI0_INDICES);
            this.tri1 = new Gpu.DrawCommand(this.vs, this.ps, SPRITE_TRI1_INDICES);
        }

        /*override*/ draw() {
            this.tri0.xfrm = this.xfrm;
            this.tri1.xfrm = this.xfrm;
            this.tri0.enqueue();
            this.tri1.enqueue();
        }
    }

    export class MeshSprite extends affine.Sprite {
        verts: affine.Vertex[];
        vs: affine.Gpu.VertexShader;
        ps: affine.Gpu.PixelShader;
        cmds: affine.Gpu.DrawCommand[];

        public get width() { return this.vs.bounds.width; }
        public get height() { return this.vs.bounds.height; }

        constructor(
            scene: Scene,
            hVertCount: number,
            vVertCount: number,
            hVertStep: number,
            vVertStep: number,
            vs: (src: affine.Vertex[]) => affine.Gpu.VertexShader,
            ps: () => affine.Gpu.PixelShader) {
            super(scene);
            hVertCount = Math.max(2, hVertCount);
            vVertCount = Math.max(2, vVertCount);
            hVertStep = Math.max(0, hVertStep);
            vVertStep = Math.max(0, vVertStep);
            const width = hVertStep * (hVertCount - 1);
            const height = vVertStep * (vVertCount - 1);
            const halfWidth = width >> 1;
            const halfHeight = height >> 1;
            const uUvStep = hVertStep / width;
            const vUvStep = vVertStep / height;
            this.verts = [];
            for (let vIdx = 0, vPos = -halfHeight, vUv = 0; vIdx < vVertCount; ++vIdx, vPos += vVertStep, vUv += vUvStep) {
                for (let hIdx = 0, hPos = -halfWidth, uUv = 0; hIdx < hVertCount; ++hIdx, hPos += hVertStep, uUv += uUvStep) {
                    const iVert = vIdx * hVertCount + hIdx;
                    this.verts[iVert] = new affine.Vertex(
                        affine.Vec2.N(hPos, vPos),
                        affine.Vec2.N(uUv, vUv)
                    );
                }
            }
            this.vs = vs(this.verts);
            this.ps = ps();
            this.cmds = [];
            for (let vIdx = 0; vIdx < vVertCount - 1; ++vIdx) {
                for (let hIdx = 0; hIdx < hVertCount - 1; ++hIdx) {
                    const iVert = vIdx * hVertCount + hIdx;
                    const tri0 = [iVert, iVert + hVertCount, iVert + hVertCount + 1];
                    const tri1 = [iVert + hVertCount + 1, iVert + 1, iVert];
                    this.cmds.push(new affine.Gpu.DrawCommand(this.vs, this.ps, tri0));
                    this.cmds.push(new affine.Gpu.DrawCommand(this.vs, this.ps, tri1));
                }
            }
        }

    /*override*/ draw() {
            this.cmds.forEach(cmd => cmd.xfrm = this.xfrm);
            this.cmds.forEach(cmd => cmd.enqueue());
        }
    }

    export class ImageSprite extends QuadSprite {
        constructor(scene: Scene, protected img: Image) {
            super(
                scene,
                img.width,
                img.height,
                (src: Vertex[]) => new Gpu.BasicVertexShader(src),
                () => new Gpu.TexturedPixelShader(img));
        }
    }
}
