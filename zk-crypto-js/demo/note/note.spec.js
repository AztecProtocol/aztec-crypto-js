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

        expect(importedNote.gamma.getPublic(false, 'hex')).to.equal(note.gamma.getPublic(false, 'hex'));
        expect(importedNote.sigma.getPublic(false, 'hex')).to.equal(note.sigma.getPublic(false, 'hex'));
    });

    it('note.create and note.derive create well formed notes', async () => {
        const spendingKey = secp256k1.keyFromPrivate(crypto.randomBytes(32, 16));
        const result = notes.create(spendingKey.getPublic(true, 'hex'), 1234);
        const expected = notes.derive(result.getPublic(), `0x${spendingKey.getPrivate('hex')}`);
        expect(result.gamma.getPublic(false, 'hex')).to.equal(expected.gamma.getPublic(false, 'hex'));
        expect(result.sigma.getPublic(false, 'hex')).to.equal(expected.sigma.getPublic(false, 'hex'));
        expect(result.k.toString(16)).to.equal(expected.k.toString(16));
        expect(result.a.toString(16)).to.equal(expected.a.toString(16));
        expect(expected.k.toString(10)).to.equal('1234');
    });
});
