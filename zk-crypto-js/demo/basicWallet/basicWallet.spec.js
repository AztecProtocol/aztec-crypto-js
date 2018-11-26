const chai = require('chai');
const crypto = require('crypto');

const db = require('../db/db');
const basicWallet = require('./basicWallet');

const { expect } = chai;

describe('basicWallet tests', () => {
    beforeEach(() => {
        db.clear();
    });

    it('can read and write', async () => {
        const name = 'test';
        const publicKey = `0x${crypto.randomBytes(32, 16).toString('hex')}`;
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
            `0x${crypto.randomBytes(32, 16).toString('hex')}`,
            'test'
        );
        basicWallet.update('test', { foo: 'bar' });
        const result = basicWallet.get(expected.address);
        expect(result.foo).to.equal('bar');
    });
});
