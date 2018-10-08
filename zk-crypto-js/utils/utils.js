const BN = require('bn.js');
const crypto = require('crypto');

const { FIELD_MODULUS, GROUP_MODULUS, fieldReduction, groupReduction, zeroRed, weierstrassBRed } = require('../params');

const decompressionMask = new BN('7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 16);
const compressionMask = new BN('8000000000000000000000000000000000000000000000000000000000000000', 16);

const utils = {};

// @param compressed: 32-byte representation of a bn128 G1 element in BN.js form
utils.decompress = (compressed) => {
    const yBit = compressed.testn(255);
    let x = compressed.maskn(255).toRed(fieldReduction);
 
    let y2 = x.redSqr().redMul(x).redIAdd(weierstrassBRed);

    let yRoot = y2.redSqrt();
    if (yRoot.redSqr().redSub(y2).cmp(zeroRed)) {
        throw new Error('x^3 + 3 not a square, malformed input');
    }
    let y = yRoot.fromRed();
    if (Boolean(y.isOdd()) !== Boolean(yBit)) {
        y = FIELD_MODULUS.sub(y);
    }
    return { x: x.fromRed(), y };
};

utils.compress = (x, y) => {
    let compressed = x;
    if (y.testn(0)) {
        compressed = compressed.or(compressionMask);
    }
    return compressed;
};

utils.randomG1 = () => {
    function recurse() {
        let x = new BN(crypto.randomBytes(32), 16).toRed(fieldReduction)
        let y2 = x.redSqr().redMul(x).redIAdd(weierstrassBRed);
        const y = y2.redSqrt();
        if (y.redSqr(y).redSub(y2).cmp(zeroRed)) {
            return recurse();
        } else {
            return ({ x: x.fromRed(), y: y.fromRed() });
        }  
    }
    return recurse();
};

utils.randomGroupScalar = () => {
    return new BN(crypto.randomBytes(32), 16).toRed(groupReduction);
}

module.exports = utils;