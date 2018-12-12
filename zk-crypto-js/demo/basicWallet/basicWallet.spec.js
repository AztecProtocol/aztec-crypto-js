const chai = require('chai');
const crypto = require('crypto');

const db = require('../db/db');
const basicWallet = require('./basicWallet');
const secp256k1 = require('../../secp256k1/secp256k1');

const { expect } = chai;

describe('basicWallet tests', () => {
    beforeEach(() => {
        db.clear();
    });

    it('can read and write', async () => {
        const name = 'test';
        const publicKey = `0x${crypto.randomBytes(32).toString('hex')}`;
        const expected = basicWallet.createFromPublicKey(publicKey, name);
        const result = basicWallet.get(expected.address);
        expect(!expected.name).to.equal(false);
        expect(!expected.publicKey).to.equal(false);
        expect(!expected.name).to.equal(false);
        expect(expected.name).to.equal(result.name);
        expect(expected.address).to.equal(result.address);
        expect(expected.publicKey).to.equal(result.publicKey);
    });

    it('can update', async () => {
        const expected = basicWallet.createFromPublicKey(
            `0x${crypto.randomBytes(32).toString('hex')}`,
            'test'
        );
        basicWallet.update(expected.address, { foo: 'bar' });
        const result = basicWallet.get(expected.address);
        expect(result.foo).to.equal('bar');
    });

    it('address and public key are expected to be well-formed', () => {
        const privateKey = `0x${crypto.randomBytes(32).toString('hex')}`;
        const wallet = basicWallet.createFromPrivateKey(privateKey);
        const publicKey = secp256k1.keyFromPublic(wallet.publicKey.slice(2), 'hex');
        const expected = secp256k1.g.mul(Buffer.from(privateKey.slice(2), 'hex'));
        expect(publicKey.getPublic().eq(expected)).to.equal(true);
    });
});
