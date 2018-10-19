const chai = require('chai');
const crypto = require('crypto');

const BN = require('bn.js');
const ecdsa = require('./ecdsa');
const { expect, assert } = chai;

describe('ecdsa.js tests', () => {

    it('can construct a valid signature', async () => {
        const { publicKey, privateKey } = ecdsa.generateKey();
        const hash = new BN(crypto.randomBytes(16), 16);
        const { r, s, v } = ecdsa.signMessage(hash, privateKey);
        const res = ecdsa.verifyMessage(hash, r, s, publicKey);
        expect(res).to.equal(true);
    });

    it('can recover signing public key', async () => {
        const { publicKey, privateKey } = ecdsa.generateKey();
        const hash = new BN(crypto.randomBytes(16), 16);
        const { r, s, v } = ecdsa.signMessage(hash, privateKey);
        const res = ecdsa.recoverPublicKey(hash, r, s, v);
        expect(res.eq(publicKey)).to.equal(true);

    });
});