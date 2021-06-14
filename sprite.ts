namespace affine {
    export class Sprite extends Thing implements IPlaceable, ISizable {
        private xfrm_: Transform;

        /* abstract */ get width(): Fx8 { return Fx.zeroFx8; }
        /* abstract */ get height(): Fx8 { return Fx.zeroFx8; }

        public get xfrm() { return this.xfrm_; }

        constructor(public scene: Scene) {
            super("sprite");
            this.xfrm_ = new Transform();
            this.xfrm_.parent = scene.xfrm;
        }
    }

    const IMAGE_SPRITE_TRI0_INDICES = [0, 3, 2];
    const IMAGE_SPRITE_TRI1_INDICES = [2, 1, 0];

    export class ImageSprite extends Sprite {
        img: Image;
        verts: Vertex[];
        vs: Gpu.VertexShader;
        tri0: Gpu.DrawCommand;
        tri1: Gpu.DrawCommand;

        public get width() { return this.vs.bounds.width; }
        public get height() { return this.vs.bounds.height; }

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

        constructor(scene: Scene, imgName: string) {
            super(scene);
            this.img = helpers.getImageByName(imgName);
            const left = Fx8(-(this.img.width >> 1));
            const right = Fx8(this.img.width >> 1);
            const top = Fx8(-(this.img.height >> 1));
            const bottom = Fx8(this.img.height >> 1);
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
            this.vs = new Gpu.BasicVertexShader(this.verts);
            this.tri0 = new Gpu.DrawTexturedTri(this.vs, IMAGE_SPRITE_TRI0_INDICES, this.img);
            this.tri1 = new Gpu.DrawTexturedTri(this.vs, IMAGE_SPRITE_TRI1_INDICES, this.img);
        }

        /* override */ update() {
        }

        /* override */ draw() {
            this.tri0.xfrm = this.xfrm;
            this.tri1.xfrm = this.xfrm;
            this.tri0.enqueue();
            this.tri1.enqueue();
        }
    }
}