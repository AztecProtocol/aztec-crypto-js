const BN = require('bn.js');
const crypto = require('crypto');
const {
    FIELD_MODULUS,
    fieldReduction,
    groupReduction,
    zeroRed,
    weierstrassBRed,
} = require('../params');

const compressionMask = new BN('8000000000000000000000000000000000000000000000000000000000000000', 16);

const utils = {};

// @param compressed: 32-byte representation of a bn128 G1 element in BN.js form
utils.decompress = (compressed) => {
    const yBit = compressed.testn(255);
    const x = compressed.maskn(255).toRed(fieldReduction);
    const y2 = x.redSqr().redMul(x).redIAdd(weierstrassBRed);
    const yRoot = y2.redSqrt();
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

utils.randomGroupScalar = () => {
    return new BN(crypto.randomBytes(32), 16).toRed(groupReduction);
};

utils.toBytes32 = function toBytes32(input, padding = 'left') { // assumes hex format
    let s = input;
    if (s.length > 64) {
        throw new Error(`string ${input} is more than 32 bytes long!`);
    }
    while (s.length < 64) {
        if (padding === 'left') { // left pad to hash a number. Right pad to hash a string
            s = `0${s}`;
        } else {
            s = `${s}0`;
        }
    }
    return s;
};

utils.bnToHex = function bnToHex(bignum) {
    if (!BN.isBN(bignum)) {
        throw new Error(`expected ${bignum} to be of type BN`);
    }
    return `0x${utils.toBytes32(bignum.toString(16))}`;
};


utils.randomBytes32 = function randomBytes32() {
    return `0x${toBytes32(new BN(crypto.randomBytes(32), 16).toString(16))}`;
};

module.exports = utils;
