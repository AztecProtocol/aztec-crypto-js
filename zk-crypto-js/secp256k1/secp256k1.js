const elliptic = require('elliptic');
const web3Utils = require('web3-utils');

function Secp256k1() {
    const curve = new elliptic.ec("secp256k1"); // eslint-disable-line

    curve.accountFromPrivateKey = function accountFromPrivateKey(privateKey) {
        const buffer = Buffer.from(privateKey.slice(2), 'hex');
        const ecKey = curve.keyFromPrivate(buffer);
        const publicKey = `0x${ecKey.getPublic(false, 'hex').slice(2)}`; // remove elliptic.js encoding byte
        const publicHash = web3Utils.sha3(publicKey);
        const address = web3Utils.toChecksumAddress(`0x${publicHash.slice(-40)}`);
        return {
            privateKey,
            publicKey: `0x${ecKey.getPublic(false, 'hex')}`,
            address,
        };
    };

    return curve;
}

module.exports = Secp256k1();
