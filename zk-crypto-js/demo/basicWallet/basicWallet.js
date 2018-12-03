const web3Utils = require('web3-utils');

const db = require('../db/db');
const secp256k1 = require('../../secp256k1/secp256k1');
const web3 = require('../web3Listener');

const basicWallet = {};

basicWallet.createFromPublicKey = function createFromPublicKey(publicKey, name) {
    const publicHash = web3Utils.sha3(publicKey);
    const address = web3Utils.toChecksumAddress(`0x${publicHash.slice(-40)}`);
    const wallet = {
        name,
        publicKey,
        address,
        nonce: 0,
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
        nonce: 0,
    };
    return db.wallets.create(wallet);
};

basicWallet.get = function get(address) {
    const wallet = db.wallets.get(address);
    if (!wallet) {
        throw new Error(`could not find wallet at address ${address}`);
    }
    return wallet;
};

basicWallet.update = function update(address, data) {
    const wallet = db.wallets.get(address);
    if (!wallet) {
        throw new Error(`could not find wallet at address ${address}`);
    }

    return db.wallets.update(address, {
        ...wallet,
        ...data,
    });
};

basicWallet.init = async function init(address) {
    const nonce = await web3.eth.getTransactionCount(address);
    basicWallet.update(address, {
        nonce,
    });
};

module.exports = basicWallet;
