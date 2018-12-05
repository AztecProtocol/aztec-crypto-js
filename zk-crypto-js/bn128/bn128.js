const BN = require('bn.js');
const EC = require('elliptic');
const crypto = require('crypto');

const {
    FIELD_MODULUS,
    GROUP_MODULUS,
    H_X,
    H_Y,
    groupReduction,
    kMax,
} = require('../params');

function Bn128() {
    // eslint-disable-next-line new-cap
    const curve = new EC.curve.short({
        a: '0',
        b: '3',
        p: FIELD_MODULUS.toString(16),
        n: GROUP_MODULUS.toString(16),
        gRed: false,
        g: ['1', '2'],
    });

    // TODO, get rid of this
    // eslint-disable-next-line new-cap
    curve.ec = new EC.ec({
        curve: {
            curve,
            a: '0',
            b: '3',
            p: curve.p,
            n: curve.n,
            gRed: false,
            g: curve.g,
        },
    });

    curve.groupReduction = BN.red(curve.n);

    curve.randomGroupScalar = () => {
        return new BN(crypto.randomBytes(32), 16).toRed(curve.groupReduction);
    };

    curve.randomPoint = function randomPoint() {
        function recurse() {
            const x = new BN(crypto.randomBytes(32), 16).toRed(curve.red);
            const y2 = x.redSqr().redMul(x).redIAdd(curve.b);
            const y = y2.redSqrt();
            if (y.redSqr(y).redSub(y2).cmp(curve.a)) {
                return recurse();
            }
            return curve.point(x, y);
        }
        return recurse();
    };

    curve.getFromHash = function getFromHash(x) {
        const y2 = x.redSqr().redMul(x).redIAdd(curve.b);
        const y = y2.redSqrt();
        if (!y.redSqr().eq(y2)) {
            throw new Error('point is not on curve');
        }
        return { x, y };
    };
    curve.h = curve.point(H_X, H_Y);

    // @dev method to brute-force recover k from (\gamma, \gamma^{k})
    // TODO: replace with optimized C++ implementation, this is way too slow
    curve.recoverMessage = function recoverMessage(gamma, gammaK) {
        if (gammaK.isInfinity()) {
            return 1;
        }
        let accumulator = gamma;
        let k = 1;
        while (k < 1000000) {
            if (accumulator.eq(gammaK)) {
                break;
            }
            accumulator = accumulator.add(gamma);
            k += 1;
        }
        if (k === kMax) {
            throw new Error('could not find k!');
        }
        return k;
    };

    curve.groupReduction = groupReduction;

    function AztecCompressed(p1, p2) {
        if (p1.y.eq(p2.y)) {
            this.beta = p1.y;
            this.beta.setn(255, true);
            this.alpha = p1.x;
        } else {
            this.beta = p1.y.redSub(p2.y);
            this.alpha = this.beta.redInvm().redMul(p1.x.redSub(p2.x));
        }
        this.x2 = p2.x;
        this.half = new BN(2).toRed(curve.red).redInvm();
    }

    AztecCompressed.prototype.aztecDecompress = function aztecDecompress() {
        if (this.beta.testn(255)) {
            const y1 = this.beta.maskn(256);
            return {
                p1: curve.point(this.alpha, y1),
                p2: curve.point(this.x2, y1),
            };
        }
        const x1 = this.alpha.redMul(this.beta).redAdd(this.x2);

        const t1 = (x1.redSqr()).redAdd(this.x2.redSqr()).redAdd(x1.redMul(this.x2));

        const y1 = (t1.redMul(this.alpha)).redAdd(this.beta).redMul(this.half);

        const y2 = y1.redSub(this.beta);

        return {
            p1: curve.point(x1, y1),
            p2: curve.point(this.x2, y2),
        };
    };

    curve.aztecCompressed = (p1, p2) => {
        return new AztecCompressed(p1, p2);
    };
    return curve;
}

module.exports = Bn128();
