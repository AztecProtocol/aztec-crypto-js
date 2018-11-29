const web3Utils = require('web3-utils');

const db = require('../db/db');
const secp256k1 = require('../../secp256k1/secp256k1');

const basicWallet = {};

basicWallet.createFromPublicKey = function createFromPublicKey(publicKey, name) {
    const publicHash = web3Utils.sha3(publicKey);
    const address = web3Utils.toChecksumAddress(`0x${publicHash.slice(-40)}`);
    const wallet = {
        name,
        publicKey,
        address,
    };
    return db.wallets.create(wallet);
};

basicWallet.createFromPrivateKey = function createFromPrivateKey(privateKey, name) {
    const { publicKey, address } = secp256k1.accountFromPrivateKey(privateKey);
    const wallet = {
        name,
        privateKey,
        publicKey,
        address,
    };
    return db.wallets.create(wallet);
};

basicWallet.get = function get(address) {
    return db.wallets.get(address);
};

basicWallet.update = function update(address, data) {
    return db.wallets.update(address, data);
};

module.exports = basicWallet;
