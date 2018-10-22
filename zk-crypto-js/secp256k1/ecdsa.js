const crypto = require('crypto');
const BN = require('bn.js');
const elliptic = require('elliptic');

const { curve, FIELD_MODULUS, GROUP_MODULUS, groupReduction } = require('./secp256k1');
const utils = require('../utils/utils');

const Web3 = require('web3')
const web3 = new Web3();
var secp256k1 = new elliptic.ec("secp256k1");

const ecdsa = {};

// taken from web3.eth.accounts. TODO: put this somewhere sensible
var toChecksum = function toChecksum(address) {
    var addressHash = web3.utils.sha3(address.slice(2));
    var checksumAddress = "0x";
    for (var i = 0; i < 40; i++) {
        checksumAddress += parseInt(addressHash[i + 2], 16) > 7 ? address[i + 2].toUpperCase() : address[i + 2];
    } return checksumAddress;
};

var fromPrivate = function fromPrivate(privateKey) {
    var buffer = new Buffer(privateKey.slice(2), "hex");
    var ecKey = secp256k1.keyFromPrivate(buffer);
    var publicKey = "0x" + ecKey.getPublic(false, 'hex').slice(2);
    var publicHash = web3.utils.sha3(publicKey);
    var address = toChecksum("0x" + publicHash.slice(-40));
    return {
        address: address,
        privateKey: privateKey
    };
};

ecdsa.generateKeyPair = () => {
    const account = web3.eth.accounts.create();
    const privateKey = new BN(account.privateKey.slice(2), 16);
    const address = account.address;
    const publicKey = curve.g.mul(privateKey);

    return {
        publicKey,
        privateKey,
        address,
    };
};

ecdsa.signMessage = (hash, privateKey) => {
    var signature = secp256k1.keyFromPrivate(Buffer.from(utils.toBytes32(privateKey.toString(16)), 'hex')).sign(hash, { canonical: true });
    return {
        v: 27 + Number(signature.recoveryParam),
        r: signature.r,
        s: signature.s,
    };
};

ecdsa.verifyMessage = (hash, r, s, publicKey) => {
    return secp256k1.verify(hash, { r, s }, publicKey);
};

ecdsa.recoverPublicKey = (hash, r, s, v) => {
    var ecPublicKey = secp256k1.recoverPubKey(hash, { r, s }, v < 2 ? v : 1 - v % 2); // because odd vals mean v=0... sadly that means v=0 means v=1... I hate that
    return ecPublicKey;
}

ecdsa.web3Comparison = () => {
    const account = web3.eth.accounts.create();
    const privateKey = account.privateKey;
    let initialMessage = account.address;
    const web3Sig = account.sign(account.address, ``);
    const initialBuffer = Buffer.from(web3.utils.hexToBytes(initialMessage, 'hex'));
    const preamble = Buffer.from(`\x19Ethereum Signed Message:\n${initialBuffer.length}`);
    const messageBuffer = Buffer.concat([preamble, initialBuffer]);
    const hashedMessage = web3.utils.sha3(messageBuffer);

    const result = ecdsa.signMessage(new BN(hashedMessage.slice(2), 16), new BN(privateKey.slice(2), 16));

    return ({ result, web3Sig });
}

module.exports = ecdsa;