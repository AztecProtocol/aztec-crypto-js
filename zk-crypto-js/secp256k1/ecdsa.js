const crypto = require('crypto');
const BN = require('bn.js');

const { curve, FIELD_MODULUS, GROUP_MODULUS, groupReduction } = require('./secp256k1');

const ecdsa = {};

ecdsa.generateKey = () => {
    let privateKey = new BN(crypto.randomBytes(32), 16).umod(GROUP_MODULUS);
    let publicKey = curve.g.mul(privateKey);
    return { privateKey, publicKey };
};

ecdsa.signMessage = (hash, privateKey) => {
    let z = hash.toRed(groupReduction);
    let k = new BN(crypto.randomBytes(32), 16).toRed(groupReduction);
    let rGroup = curve.g.mul(k);
    let rFull = rGroup.x.fromRed();
    let r = rFull.toRed(groupReduction);
    let s = k.redInvm().redMul(z.redAdd(r.redMul(privateKey.toRed(groupReduction))));
    let v = rGroup.y.fromRed().isOdd();

    return { r: rFull, s , v };
};

ecdsa.verifyMessage = (hash, r, s, publicKey) => {
    const z = hash.toRed(groupReduction);
    const w = s.redInvm();
    const res = (curve.g.mul(z.redMul(w))).add(publicKey.mul(r.toRed(groupReduction).redMul(w)));
    return (res.x.fromRed().umod(GROUP_MODULUS).eq(r));
};

ecdsa.recoverPublicKey = (hash, r, s, v) => {
    const z = hash.toRed(groupReduction);
    const w = s.redInvm();
    const u1 = z.redMul(w);
    const u2 = r.toRed(groupReduction).redMul(w);
    const rGroup = curve.pointFromX(r, v);
    const t1 = rGroup.add(curve.g.mul(u1).neg()).mul(u2.redInvm());
    return t1;
}

module.exports = ecdsa;