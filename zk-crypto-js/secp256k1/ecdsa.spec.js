const chai = require('chai');
const crypto = require('crypto');

const BN = require('bn.js');
const ecdsa = require('./ecdsa');
const utils = require('../utils/utils');
const { expect, assert } = chai;

describe('ecdsa.js tests', () => {

    it('can construct a valid signature', async () => {
        const { publicKey, privateKey, address } = ecdsa.generateKeyPair();
        const hash = new BN(crypto.randomBytes(16), 16);
        const { r, s, v } = ecdsa.signMessage(hash, privateKey);
        const res = ecdsa.verifyMessage(hash, r, s, publicKey);
        expect(res).to.equal(true);
    });

    it('can recover signing public key', async () => {
        const { publicKey, privateKey } = ecdsa.generateKeyPair();
        const hash = new BN(crypto.randomBytes(16), 16);
        const { r, s, v } = ecdsa.signMessage(hash, privateKey);
        const res = ecdsa.recoverPublicKey(hash, r, s, v);
        expect(res.eq(publicKey)).to.equal(true);
    });

    it('signs the same signatures as web3?', async () => {
        const { result, web3Sig } = ecdsa.web3Comparison();
        expect(`0x${utils.toBytes32(result.r.toString(16))}` === web3Sig.r);
        expect(`0x${utils.toBytes32(result.s.toString(16))}` === web3Sig.s);
        expect(result.v === web3Sig.v);
    });
});