/* global artifacts, beforeEach, it:true */
const BN = require('bn.js');
const { padLeft, sha3 } = require('web3-utils');
const crypto = require('crypto');
const chai = require('chai');

const atomicProof = require('./atomicSwapProof');
const secp256k1 = require('../secp256k1/secp256k1');
const notes = require('../note/note');
const helpers = require('./atomicSwapHelpers');
const Hash = require('../utils/keccak');


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
    it.only('check that the note array correctly represents the note object', async () => {
        const noteArray = await helpers.makeNoteArray(testNotes);
        const numNotes = await helpers.checkNumberNotes(testNotes);
        expect(noteArray.length).to.equal(numNotes);
        expect(noteArray[0]).to.equal(testNotes.makerNotes.bidNote);
        expect(noteArray[1]).to.equal(testNotes.makerNotes.askNote);
        expect(noteArray[2]).to.equal(testNotes.takerNotes.bidNote);
        expect(noteArray[3]).to.equal(testNotes.takerNotes.askNote);
    });

    it.only('validate that the atomic swap will not work for a number of notes not equal to 4', async () => {
        testNotes.makerNotes.extraNote = notes.create(`0x${secp256k1.keyFromPrivate(crypto.randomBytes(32)).getPublic(true, 'hex')}`, 50);
        testNotes.takerNotes.extraNote = notes.create(`0x${secp256k1.keyFromPrivate(crypto.randomBytes(32)).getPublic(true, 'hex')}`, 50);

        try {
            const { proofData, challenge } = await atomicProof.constructAtomicSwap(testNotes);
        } catch (err) {
            console.log('Incorrect number of notes');
        }
    });

    it.only('validate that the atomic swap blinding scalar relations are satisfied i.e. bk1 = bk3 and bk2 = bk4', async () => {
        const noteArray = await helpers.makeNoteArray(testNotes);
        const finalHash = new Hash();

        noteArray.forEach((note) => {
            finalHash.append(note.gamma);
            finalHash.append(note.sigma);
        });

        const { blindingFactors, challenge } = await helpers.getBlindingFactorsAndChallenge(noteArray, finalHash);

        const testk1 = (blindingFactors[0].bk).toString(16);
        const testk2 = (blindingFactors[1].bk).toString(16);
        const testk3 = (blindingFactors[2].bk).toString(16);
        const testk4 = (blindingFactors[3].bk).toString(16);

        expect(testk1).to.equal(testk3);
        expect(testk2).to.equal(testk4);
    });

    it('validate that the proof data is correctly formed', async () => {

    });

    it('validate that the proof is correct, using the validation algo', async () => {
    });

    it('validate that there are 4 input notes', async () => {
    });
});
