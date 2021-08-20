// WAVY DINO TEST
/*
class WavyVertexShader extends affine.Gpu.VertexShader {
    dim: Fx8;
    constructor(src: affine.Vertex[], dim: number) {
        super(src);
        this.dim = Fx8(dim);
    }
    public transform(index: number, xfrm: affine.Transform): void {
        const src = this.src[index];
        const dst = this.verts[index];
        xfrm.transformToRef(src.pos, dst.pos);
        const t = Fx8(this.frameId);
        const angle = Fx.toFloat(Fx.add(t, Fx.mul(this.dim, src.uv.u))) * 180 / Math.PI;
        const s = affine.trig.sin(angle);
        const offset = Fx.mul(xfrm.localScl.x, s);
        dst.pos.y = Fx.add(dst.pos.y, offset);
    }
}

class TestScene extends affine.Scene {
    sprite: affine.MeshSprite;
    scale: number;

    constructor() {
        super();
        this.scale = 1;
        const img = helpers.getImageByName("_test_dino");
        const dim = 6;
        const size = 60;
        this.sprite = new affine.MeshSprite(this, dim, dim, size / dim, size / dim,
            (src: affine.Vertex[]) => new WavyVertexShader(src, dim),
            () => new affine.Gpu.TexturedPixelShader(img));
        this.sprite.debug = true;
    }

    startup() {
        controller.setRepeatDefault(1, 1);
        controller.up.onEvent(ControllerButtonEvent.Pressed, () => this.moveUp());
        controller.up.onEvent(ControllerButtonEvent.Repeated, () => this.moveUp());
        controller.down.onEvent(ControllerButtonEvent.Pressed, () => this.moveDown());
        controller.down.onEvent(ControllerButtonEvent.Repeated, () => this.moveDown());
        controller.left.onEvent(ControllerButtonEvent.Pressed, () => this.moveLeft());
        controller.left.onEvent(ControllerButtonEvent.Repeated, () => this.moveLeft());
        controller.right.onEvent(ControllerButtonEvent.Pressed, () => this.moveRight());
        controller.right.onEvent(ControllerButtonEvent.Repeated, () => this.moveRight());
        controller.A.onEvent(ControllerButtonEvent.Pressed, () => this.scaleUp());
        controller.B.onEvent(ControllerButtonEvent.Pressed, () => this.scaleDown());
    }

    draw() {
        this.sprite.draw();
    }

    moveSpeed = Fx8(2);

    moveUp() {
        this.sprite.xfrm.localPos.y = Fx.sub(this.sprite.xfrm.localPos.y, this.moveSpeed);
    }

    moveDown() {
        this.sprite.xfrm.localPos.y = Fx.add(this.sprite.xfrm.localPos.y, this.moveSpeed);
    }

    moveLeft() {
        this.sprite.xfrm.localPos.x = Fx.sub(this.sprite.xfrm.localPos.x, this.moveSpeed);
    }

    moveRight() {
        this.sprite.xfrm.localPos.x = Fx.add(this.sprite.xfrm.localPos.x, this.moveSpeed);
    }

    scaleUp() {
        this.scale *= 1.5;
        this.sprite.xfrm.localScl = new affine.Vec2(Fx8(this.scale), Fx8(this.scale));
    }

    scaleDown() {
        this.scale /= 1.5;
        if (this.scale < 0.1) this.scale = 0.1;
        this.sprite.xfrm.localScl = new affine.Vec2(Fx8(this.scale), Fx8(this.scale));
    }
}

affine.Scene.pushScene(new TestScene());
*/

// DUCK TEST
/*
class TestScene extends affine.Scene {
    sprite: affine.ImageSprite;

    constructor() {
        super();
        this.sprite = new affine.ImageSprite(this, helpers.getImageByName("_test_duck"));
        this.sprite.xfrm.localScl = new affine.Vec2(Fx8(2.5), Fx8(2.5));
    }

    startup() {
        controller.setRepeatDefault(1, 1);
        controller.up.onEvent(ControllerButtonEvent.Pressed, () => {
            this.sprite.xfrm.localRot += 1;
        });
        controller.down.onEvent(ControllerButtonEvent.Pressed, () => {
            this.sprite.xfrm.localRot -= 1;
        });
    }

    draw() {
        this.sprite.draw();
    }
}

affine.Scene.pushScene(new TestScene());
*/