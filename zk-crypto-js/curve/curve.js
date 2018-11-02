const BN = require('bn.js');
const EC = require('elliptic');
const crypto = require('crypto');

const { FIELD_MODULUS, GROUP_MODULUS, H_X, H_Y, fieldReduction, weierstrassBRed, zeroRed } = require('../params');

function Curve() {
    const curve = new EC.curve.short({
        a: '0',
        b: '3',
        p: FIELD_MODULUS.toString(16),
        n: GROUP_MODULUS.toString(16),
        gRed: false,
        g: ['1', '2'],
    });

    curve.randomPoint = function () {
        function recurse() {
            let x = new BN(crypto.randomBytes(32), 16).toRed(fieldReduction)
            let y2 = x.redSqr().redMul(x).redIAdd(weierstrassBRed);
            const y = y2.redSqrt();
            if (y.redSqr(y).redSub(y2).cmp(zeroRed)) {
                return recurse();
            } else {
                return curve.point(x.toString(16), y.toString(16), true);
            }  
        }
        return recurse();
    }

    curve.getFromHash = function (x) {
        let y2 = x.redSqr().redMul(x).redIAdd(weierstrassBRed);
        const y = y2.redSqrt();
        if (!y.redSqr().eq(y2)) {
            throw new Error('point is not on curve');
        }
        return { x, y };
    }
    curve.h = curve.point(H_X, H_Y);

    return curve;
};

module.exports = Curve();
