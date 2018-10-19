const BN = require('bn.js');
const EC = require('elliptic');
const crypto = require('crypto');

const FIELD_MODULUS = new BN('fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f', 16);
const GROUP_MODULUS = new BN('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141', 16);

const G_X = new BN('79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798', 16);
const G_Y = new BN('483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8', 16);

const fieldReduction = BN.red(FIELD_MODULUS);
const groupReduction = BN.red(GROUP_MODULUS);
const weierstrassBRed = (new BN(7).toRed(fieldReduction));
const zeroRed = (new BN(0).toRed(fieldReduction));

function Secp256k1() {
    const curve = new EC.curve.short({
        a: '0',
        b: '7',
        p: FIELD_MODULUS.toString(16),
        n: GROUP_MODULUS,
        g: [
            '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
            '483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8'
          ]
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

    return curve;
};

module.exports = {
    fieldReduction,
    groupReduction,
    FIELD_MODULUS,
    GROUP_MODULUS,
    curve: Secp256k1(),
};