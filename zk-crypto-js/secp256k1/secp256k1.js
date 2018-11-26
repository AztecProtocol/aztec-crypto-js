const BN = require('bn.js');
const elliptic = require('elliptic');
const crypto = require('crypto');
const web3Utils = require('web3-utils');

const FIELD_MODULUS = new BN('fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f', 16);

const fieldReduction = BN.red(FIELD_MODULUS);
const weierstrassBRed = (new BN(7).toRed(fieldReduction));
const zeroRed = (new BN(0).toRed(fieldReduction));

function Secp256k1() {
    const curve = new elliptic.ec("secp256k1"); // eslint-disable-line

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

    curve.accountFromPrivateKey = function accountFromPrivateKey(privateKey) {
        const buffer = Buffer.from(privateKey.slice(2), 'hex');
        const ecKey = curve.keyFromPrivate(buffer);
        const publicKey = `0x${ecKey.getPublic(false, 'hex').slice(2)}`;
        const publicHash = web3Utils.sha3(publicKey);
        const address = web3Utils.toChecksumAddress(`0x${publicHash.slice(-40)}`);
        return {
            privateKey,
            publicKey,
            address,
        };
    };

    return curve;
}

module.exports = Secp256k1();
