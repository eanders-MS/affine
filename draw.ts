namespace affine {
    export function drawLine(img: Image, p0: Vec2, p1: Vec2, color: number) {
        let x0 = fx.floor(p0.x);
        let y0 = fx.floor(p0.y);
        const x1 = fx.floor(p1.x);
        const y1 = fx.floor(p1.y);
        const dx = Fx.abs(Fx.sub(x1, x0));
        const sx = x0 < x1 ? Fx.oneFx8 : Fx8(-1);
        const dy = Fx.neg(Fx.abs(Fx.sub(y1, y0)));
        const sy = y0 < y1 ? Fx.oneFx8 : Fx8(-1);
        let err = Fx.add(dx, dy);
        while (true) {
            img.setPixel(Fx.toInt(x0), Fx.toInt(y0), color);
            if (x0 == x1 && y0 == y1) break;
            let e2 = Fx.mul(Fx.twoFx8, err);
            if (e2 >= dy) {
                err = Fx.add(err, dy);
                x0 = Fx.add(x0, sx);
            }
            if (e2 <= dx) {
                err = Fx.add(err, dx);
                y0 = Fx.add(y0, sy);
            }
        }
    }
}
