namespace affine {
    export function drawLineFromPts(img: Image, p0: Vec2, p1: Vec2, color: number) {
        drawLine(img, p0.x, p0.y, p1.x, p1.y, color);
    }

    export function drawLine(img: Image, x0: Fx8, y0: Fx8, x1: Fx8, y1: Fx8, color: number) {
        x0 = fx.floor(x0);
        y0 = fx.floor(y0);
        x1 = fx.floor(x1);
        y1 = fx.floor(y1);
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
