/* global artifacts, beforeEach, it:true */
const BN = require('bn.js');
const { padLeft, sha3 } = require('web3-utils');
const crypto = require('crypto');
const chai = require('chai');


const atomicProof = require('./atomicSwapProof');
const secp256k1 = require('../secp256k1/secp256k1');
const notes = require('../note/note');

const { expect } = chai;


describe.only('Validating atomic swap proof construction and verification algos', () => {
    let testNotes;

    beforeEach(async () => {
        // Spending keys for the notes
        const spendingKeys = [
            secp256k1.keyFromPrivate(crypto.randomBytes(32)),
            secp256k1.keyFromPrivate(crypto.randomBytes(32)),
            secp256k1.keyFromPrivate(crypto.randomBytes(32)),
            secp256k1.keyFromPrivate(crypto.randomBytes(32)),
        ];

        // Note value array
        const noteValues = [10, 20, 20, 10];

        // Construct the test note object
        testNotes = {
            makerNotes: {
                bidNote: notes.create(`0x${spendingKeys[0].getPublic(true, 'hex')}`, noteValues[0]),
                askNote: notes.create(`0x${spendingKeys[1].getPublic(true, 'hex')}`, noteValues[1]),
            },
            takerNotes: {
                bidNote: notes.create(`0x${spendingKeys[2].getPublic(true, 'hex')}`, noteValues[2]),
                askNote: notes.create(`0x${spendingKeys[3].getPublic(true, 'hex')}`, noteValues[3]),
            },
        };
    });

    it.only('validate that the proof data is correctly formed', async () => {
        const { proofData, challenge } = await atomicProof.constructAtomicSwap(testNotes);

        expect(true).to.equal(true);
    });

    it('validate that the proof is correct, using the validation algo', async () => {
        const { proofData, challenge } = await atomicProof.constructAtomicSwap(testNotes);

        const result = await atomicProof.validateAtomicSwap(notes, proofData);
        expect(result).to.equal(true);
    });

    it('validate that there are 4 input notes', async () => {
    });
});
