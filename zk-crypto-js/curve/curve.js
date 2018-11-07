const BN = require('bn.js');
const EC = require('elliptic');
const crypto = require('crypto');

const {
    FIELD_MODULUS,
    GROUP_MODULUS,
    H_X,
    H_Y,
    fieldReduction,
    weierstrassBRed,
    zeroRed,
} = require('../params');

function Curve() {
    // eslint-disable-next-line new-cap
    const curve = new EC.curve.short({
        a: '0',
        b: '3',
        p: FIELD_MODULUS.toString(16),
        n: GROUP_MODULUS.toString(16),
        gRed: false,
        g: ['1', '2'],
    });

    curve.randomPoint = function randomPoint() {
        function recurse() {
            const x = new BN(crypto.randomBytes(32), 16).toRed(fieldReduction);
            const y2 = x.redSqr().redMul(x).redIAdd(weierstrassBRed);
            const y = y2.redSqrt();
            if (y.redSqr(y).redSub(y2).cmp(zeroRed)) {
                return recurse();
            }
            return curve.point(x.toString(16), y.toString(16), true);
        }
        return recurse();
    };

    curve.getFromHash = function getFromHash(x) {
        const y2 = x.redSqr().redMul(x).redIAdd(weierstrassBRed);
        const y = y2.redSqrt();
        if (!y.redSqr().eq(y2)) {
            throw new Error('point is not on curve');
        }
        return { x, y };
    };
    curve.h = curve.point(H_X, H_Y);

    // @dev method to brute-force recover k from (\gamma, \gamma^{k})
    // TODO: replace with optimized C++ implementation.
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
        if (k === 1000000) {
            throw new Error('could not find k!');
        }
        return k;
    };
    return curve;
}

module.exports = Curve();
