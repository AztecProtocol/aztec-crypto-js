const chai = require('chai');
const crypto = require('crypto');
const web3Utils = require('web3-utils');

const notes = require('./notes');
const secp256k1 = require('../../secp256k1/secp256k1');

const { padLeft } = web3Utils;
const { expect } = chai;


describe('note tests', () => {
    it('notes.fromPublic and notes.fromViewKey create well formed notes', async () => {
        const a = padLeft(crypto.randomBytes(32, 16).toString('hex'), 64);
        const k = padLeft(web3Utils.toHex('13456').slice(2), 8);
        const ephemeral = secp256k1.keyFromPrivate(crypto.randomBytes(32, 16));
        const viewKey = `0x${a}${k}${padLeft(ephemeral.getPublic(true, 'hex'), 66)}`;
        const note = notes.fromViewKey(viewKey);
        const expectedViewKey = note.getView();
        expect(expectedViewKey).to.equal(viewKey);
        const exportedPublicKey = note.getPublic();

        const importedNote = notes.fromPublicKey(exportedPublicKey);

        expect(importedNote.gamma.encode('hex', false)).to.equal(note.gamma.encode('hex', false));
        expect(importedNote.sigma.encode('hex', false)).to.equal(note.sigma.encode('hex', false));
    });

    it('note.create and note.derive create well formed notes', async () => {
        const spendingKey = secp256k1.keyFromPrivate(crypto.randomBytes(32, 16));
        const result = notes.create(spendingKey.getPublic(true, 'hex'), 1234);
        const expected = notes.derive(result.getPublic(), `0x${spendingKey.getPrivate('hex')}`);
        expect(result.gamma.encode('hex', false)).to.equal(expected.gamma.encode('hex', false));
        expect(result.sigma.encode('hex', false)).to.equal(expected.sigma.encode('hex', false));
        expect(result.k.toString(16)).to.equal(expected.k.toString(16));
        expect(result.a.toString(16)).to.equal(expected.a.toString(16));
        expect(expected.k.toString(10)).to.equal('1234');
    });
});
