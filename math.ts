namespace affine.math {
    export function signum(v: number): number {
        if (v > 0) return 1;
        if (v < 0) return -1;
        return 0;
    }
}

namespace affine.fx {
    export const negOneFx8 = Fx8(-1);

    export function sign(v: Fx8): Fx8 {
        return v >= Fx.zeroFx8 ? Fx.oneFx8 : Fx8(-1);
    }
    export function signum(v: Fx8): Fx8 {
        if (v > Fx.zeroFx8) return Fx.oneFx8;
        if (v < Fx.zeroFx8) return fx.negOneFx8;
        return Fx.zeroFx8;
    }
    export function clamp(v: Fx8, min: Fx8, max: Fx8): Fx8 {
        return Fx.max(min, Fx.min(v, max));
    }
    export function xor(a: Fx8, b: Fx8): Fx8 {
        return ((a as any as number) ^ (b as any as number)) as any as Fx8;
    }
    export function floor(v: Fx8): Fx8 {
        return Fx.leftShift(Fx.rightShift(v, 8), 8);
    }
    export function round(v: Fx8): Fx8 {
        // lazy implementation
        return fx.floor(Fx.add(Fx.mul(fx.sign(v), Fx8(0.5)), v));
    }
    export function mod(v: Fx8, q: Fx8): Fx8 {
        // lazy implementation
        return Fx8(Fx.toFloat(v) % Fx.toFloat(q));
    }
    export function sqrt(v: Fx8): Fx8 {
        // lazy implementation
        return Fx8(Math.sqrt(Fx.toFloat(v)));
    }
    export function random(): Fx8 {
        return Fx8(Math.random());
    }
    export function randomRange(min: Fx8, max: Fx8): Fx8 {
        return fx.irandomRange(Fx.toFloat(min), Fx.toFloat(max));
    }
    export function irandomRange(min: number, max: number): Fx8 {
        return Fx8(Math.randomRange(min, max));
    }
}

namespace affine.trig {
    let cachedSin: Fx8[];
    let cachedCos: Fx8[];

    // The number of angle steps in a full circle.
    const NUM_ANGLE_SLICES = 360;
    const NUM_ANGLE_SLICES_OVER_2 = NUM_ANGLE_SLICES >> 1;

    export function init() {
        if (!cachedSin) {
            cachedSin = trig.cacheSin(NUM_ANGLE_SLICES);
            cachedCos = trig.cacheCos(NUM_ANGLE_SLICES);
        }
    }

    /**
     * angle in [0..NUM_ANGLE_SLICES]
     */
    export function sin(angle: number): Fx8 {
        angle %= NUM_ANGLE_SLICES;
        if (angle < 0) angle += NUM_ANGLE_SLICES;
        //return Fx8(Math.sin(angle * Math.PI / NUM_ANGLE_SLICES_OVER_2));
        return cachedSin[Math.floor(angle)];
    }

    /**
     * angle in [0..NUM_ANGLE_SLICES]
     */
    export function cos(angle: number): Fx8 {
        angle %= NUM_ANGLE_SLICES;
        if (angle < 0) angle += NUM_ANGLE_SLICES;
        //return Fx8(Math.cos(angle * Math.PI / NUM_ANGLE_SLICES_OVER_2));
        return cachedCos[Math.floor(angle)];
    }

    export function cacheSin(slices: number): Fx8[] {
        let sin: Fx8[] = [];
        let anglePerSlice = 2 * Math.PI / slices;
        for (let i = 0; i < slices; i++) {
            sin.push(Fx8(Math.sin(i * anglePerSlice)));
        }
        return sin;
    }

    export function cacheCos(slices: number): Fx8[] {
        let cos: Fx8[] = [];
        let anglePerSlice = 2 * Math.PI / slices;
        for (let i = 0; i < slices; i++) {
            cos.push(Fx8(Math.cos(i * anglePerSlice)));
        }
        return cos;
    }
    trig.init();
}

namespace affine {
    export class Vec3 {
        public get x() { return this.x_; }
        public set x(v) { this.x_ = v; }
        public get y() { return this.y_; }
        public set y(v) { this.y_ = v; }
        public get z() { return this.z_; }
        public set z(v) { this.z_ = v; }
        constructor(
            public x_ = Fx.zeroFx8,
            public y_ = Fx.zeroFx8,
            public z_ = Fx.zeroFx8
        ) { }
        public set(x: Fx8, y: Fx8, z: Fx8): this {
            this.x = x;
            this.y = y;
            this.z = z;
            return this;
        }
        public static ZeroToRef(ref: Vec3): Vec3 {
            return ref.set(Fx.zeroFx8, Fx.zeroFx8, Fx.zeroFx8);
        }
    }

    export class Vec2 {
        public dirty: boolean;
        public readonly: boolean;

        public get x() { return this.x_; }
        public set x(v: Fx8) {
            if (this.readonly) throw "hey";
            this.x_ = v;
            this.dirty = true;
        }
        public get y() { return this.y_; }
        public set y(v: Fx8) {
            if (this.readonly) throw "hey";
            this.y_ = v;
            this.dirty = true;
        }

        public get u() { return this.x_; }
        public set u(n) { this.x = n; }
        public get v() { return this.y_; }
        public set v(n) { this.y = n; }

        constructor(public x_ = Fx.zeroFx8, public y_ = Fx.zeroFx8) {
        }

        public clone(): Vec2 {
            return new Vec2(this.x, this.y);
        }

        public copyFrom(v: Vec2): this {
            this.x = v.x;
            this.y = v.y;
            return this;
        }

        public set(x: Fx8, y: Fx8): this {
            this.x = x;
            this.y = y;
            return this;
        }

        public setF(x: number, y: number): this {
            this.x = Fx8(x);
            this.y = Fx8(y);
            return this;
        }

        public magSq(): Fx8 {
            return Fx.add(Fx.mul(this.x, this.x), Fx.mul(this.y, this.y));
        }

        public magSqF(): number {
            return Fx.toFloat(this.magSq());
        }

        public mag(): Fx8 {
            return Fx8(Math.sqrt(this.magSqF()));
        }

        public floor(): this {
            this.x = fx.floor(this.x);
            this.y = fx.floor(this.y);
            return this;
        }

        public add(v: Vec2): this {
            this.x = Fx.add(this.x, v.x);
            this.y = Fx.add(this.y, v.y);
            return this;
        }

        public invSlope(): Fx8 {
            if (this.y === Fx.zeroFx8) { return Fx.mul(Fx.oneFx8, fx.sign(this.y)); }
            if (this.x === Fx.zeroFx8) { return Fx.zeroFx8; }
            return Fx.div(this.x, this.y);
        }

        public static ZeroToRef(ref: Vec2): Vec2 {
            return ref.set(Fx.zeroFx8, Fx.zeroFx8);
        }

        public static N(x: number, y: number): Vec2 {
            return new Vec2(Fx8(x), Fx8(y));
        }

        public static RotateToRef(v: Vec2, angle: number, ref: Vec2): Vec2 {
            const s = trig.sin(angle);
            const c = trig.cos(angle);
            const xp = Fx.sub(Fx.mul(v.x, c), Fx.mul(v.y, s));
            const yp = Fx.add(Fx.mul(v.x, s), Fx.mul(v.y, c));
            ref.x = xp;
            ref.y = yp;
            return ref;
        }

        public static TranslateToRef(v: Vec2, p: Vec2, ref: Vec2): Vec2 {
            ref.x = Fx.add(v.x, p.x);
            ref.y = Fx.add(v.y, p.y);
            return ref;
        }

        public static ScaleToRef(v: Vec2, scale: Fx8, ref: Vec2): Vec2 {
            ref.x = Fx.mul(v.x, scale);
            ref.y = Fx.mul(v.y, scale);
            return ref;
        }

        public static FloorToRef(v: Vec2, ref: Vec2): Vec2 {
            ref.x = fx.floor(v.x);
            ref.y = fx.floor(v.y);
            return ref;
        }

        public static SetLengthToRef(v: Vec2, len: Fx8, ref: Vec2): Vec2 {
            Vec2.NormalizeToRef(v, ref);
            Vec2.ScaleToRef(ref, len, ref);
            return ref;
        }

        public static NormalizeToRef(v: Vec2, ref: Vec2): Vec2 {
            const lenSq = v.magSqF();
            if (lenSq !== 0) {
                const len = Fx8(Math.sqrt(lenSq));
                ref.x = Fx.div(v.x, len);
                ref.y = Fx.div(v.y, len);
            }
            return ref;
        }

        public static MaxToRef(a: Vec2, b: Vec2, ref: Vec2): Vec2 {
            ref.x = Fx.max(a.x, b.x);
            ref.y = Fx.max(a.y, b.y);
            return ref;
        }

        public static MinToRef(a: Vec2, b: Vec2, ref: Vec2): Vec2 {
            ref.x = Fx.min(a.x, b.x);
            ref.y = Fx.min(a.y, b.y);
            return ref;
        }

        public static SubToRef(a: Vec2, b: Vec2, ref: Vec2): Vec2 {
            ref.x = Fx.sub(a.x, b.x);
            ref.y = Fx.sub(a.y, b.y);
            return ref;
        }

        public static AddToRef(a: Vec2, b: Vec2, ref: Vec2): Vec2 {
            ref.x = Fx.add(a.x, b.x);
            ref.y = Fx.add(a.y, b.y);
            return ref;
        }

        public static MulToRef(a: Vec2, b: Vec2, ref: Vec2): Vec2 {
            ref.x = Fx.mul(a.x, b.x);
            ref.y = Fx.mul(a.y, b.y);
            return ref;
        }

        public static DivToRef(a: Vec2, b: Vec2, ref: Vec2): Vec2 {
            ref.x = b.x !== Fx.zeroFx8 ? Fx.div(a.x, b.x) : Fx.zeroFx8;
            ref.y = b.y !== Fx.zeroFx8 ? Fx.div(a.y, b.y) : Fx.zeroFx8;
            return ref;
        }

        public static AbsToRef(v: Vec2, ref: Vec2): Vec2 {
            ref.x = Fx.abs(v.x);
            ref.y = Fx.abs(v.y);
            return ref;
        }

        public static InvToRef(s: Fx8, v: Vec2, ref: Vec2): Vec2 {
            ref.x = v.x !== Fx.zeroFx8 ? Fx.div(s, v.x) : Fx.zeroFx8;
            ref.y = v.y !== Fx.zeroFx8 ? Fx.div(s, v.y) : Fx.zeroFx8;
            return ref;
        }

        public static SignToRef(v: Vec2, ref: Vec2): Vec2 {
            ref.x = fx.sign(v.x);
            ref.y = fx.sign(v.y);
            return ref;
        }

        public static SignumToRef(v: Vec2, ref: Vec2): Vec2 {
            ref.x = fx.signum(v.x);
            ref.y = fx.signum(v.y);
            return ref;
        }

        public static RandomRangeToRef(xmin: Fx8, xmax: Fx8, ymin: Fx8, ymax: Fx8, ref: Vec2): Vec2 {
            ref.x = fx.randomRange(xmin, xmax);
            ref.y = fx.randomRange(ymin, ymax);
            return ref;
        }

        public static Dot(a: Vec2, b: Vec2): Fx8 {
            return Fx.add(
                Fx.mul(a.x, b.y),
                Fx.mul(a.y, b.x));
        }

        public static Cross(a: Vec2, b: Vec2, c: Vec2): Fx8 {
            // ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)
            return Fx.sub(
                Fx.mul(
                    Fx.sub(c.x, a.x),
                    Fx.sub(b.y, a.y)),
                Fx.mul(
                    Fx.sub(c.y, a.y),
                    Fx.sub(b.x, a.x)));
        }

        public static MinOfToRef(arr: Vec2[], ref: Vec2): Vec2 {
            ref.x = Fx8(10000);
            ref.y = Fx8(10000);
            for (const v of arr) {
                if (v.x < ref.x) { ref.x = v.x; }
                if (v.y < ref.y) { ref.y = v.y; }
            }
            return ref;
        }

        public static MaxOfToRef(arr: Vec2[], ref: Vec2): Vec2 {
            ref.x = Fx8(-10000);
            ref.y = Fx8(-10000);
            for (const v of arr) {
                if (v.x > ref.x) { ref.x = v.x; }
                if (v.y > ref.y) { ref.y = v.y; }
            }
            return ref;
        }
    }

    export enum ELineIntersectionResult {
        TRUE_PARALLEL,
        COINCIDENT_PARTLY_OVERLAP,
        COINCIDENT_TOTAL_OVERLAP,
        COINCIDENT_NO_OVERLAP,
        INTERSECTION_OUTSIDE_SEGMENT,
        INTERSECTION_IN_ONE_SEGMENT,
        INTERSECTION_INSIDE_SEGMENT
    }

    export class LineIntersectionResult {
        constructor(
            public status: ELineIntersectionResult,
            public pos: Vec2 = null) { }
    }

    export class LineSegment {
        constructor(public A: Vec2 = null, public B: Vec2 = null, ref = false) {
            if (A && !ref) { this.A = this.A.clone(); }
            if (B && !ref) { this.B = this.B.clone(); }
            if (!this.A) { this.A = new Vec2() }
            if (!this.B) { this.B = new Vec2() }
        }

        public static CalcIntersection(N: LineSegment, M: LineSegment): LineIntersectionResult {
            const a = Vec2.SubToRef(N.B, N.A, new Vec2());
            const b = Vec2.SubToRef(M.B, M.A, new Vec2());

            if (Vec2.Dot(a, b) === Fx.zeroFx8) {
                // A and B are parallel

                // TODO: calc coincident type

                return new LineIntersectionResult(ELineIntersectionResult.TRUE_PARALLEL);
            } else {
                const u1 = Vec2.SubToRef(M.A, N.A, new Vec2());
                const s = Fx.div(Vec2.Dot(b, u1), Vec2.Dot(b, a));
                const p = new Vec2();
                Vec2.AddToRef(N.A, Vec2.ScaleToRef(a, s, p), p);

                // TODO: calc intersection type

                //const u2 = Vec2.SubToRef(a0, b0, new Vec2());
                //const t = Vec2.Dot(a, u2);

                return new LineIntersectionResult(ELineIntersectionResult.INTERSECTION_INSIDE_SEGMENT, p);
            }
        }
    }
}