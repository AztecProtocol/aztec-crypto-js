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


describe('Validating atomic swap proof construction and verification algos', () => {
    describe('Validate properties of the proof construction algo', () => {
        let testNotes;

        beforeEach(() => {
            const spendingKeys = [
                secp256k1.keyFromPrivate(crypto.randomBytes(32)),
                secp256k1.keyFromPrivate(crypto.randomBytes(32)),
                secp256k1.keyFromPrivate(crypto.randomBytes(32)),
                secp256k1.keyFromPrivate(crypto.randomBytes(32)),
            ];

            const noteValues = [10, 20, 10, 20];

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
        it('check that the note array correctly represents the note object', () => {
            const noteArray = helpers.makeNoteArray(testNotes);
            const numNotes = helpers.checkNumberNotes(testNotes);
            expect(noteArray.length).to.equal(numNotes);
            expect(noteArray[0]).to.equal(testNotes.makerNotes.bidNote);
            expect(noteArray[1]).to.equal(testNotes.makerNotes.askNote);
            expect(noteArray[2]).to.equal(testNotes.takerNotes.bidNote);
            expect(noteArray[3]).to.equal(testNotes.takerNotes.askNote);
        });

        it('validate that the atomic swap will not work for a number of notes not equal to 4', () => {
            testNotes.makerNotes.extraNote = notes.create(`0x${secp256k1.keyFromPrivate(crypto.randomBytes(32)).getPublic(true, 'hex')}`, 50);
            testNotes.takerNotes.extraNote = notes.create(`0x${secp256k1.keyFromPrivate(crypto.randomBytes(32)).getPublic(true, 'hex')}`, 50);

            try {
                atomicProof.constructAtomicSwap(testNotes);
            } catch (err) {
                console.log('Incorrect number of notes');
            }
        });

        it('validate that the atomic swap blinding scalar relations are satisfied i.e. bk1 = bk3 and bk2 = bk4', () => {
            const noteArray = helpers.makeNoteArray(testNotes);
            const finalHash = new Hash();

            noteArray.forEach((note) => {
                finalHash.append(note.gamma);
                finalHash.append(note.sigma);
            });

            const { blindingFactors } = helpers.getBlindingFactorsAndChallenge(noteArray, finalHash);

            const testk1 = (blindingFactors[0].bk).toString(16);
            const testk2 = (blindingFactors[1].bk).toString(16);
            const testk3 = (blindingFactors[2].bk).toString(16);
            const testk4 = (blindingFactors[3].bk).toString(16);

            expect(testk1).to.equal(testk3);
            expect(testk2).to.equal(testk4);
        });

        it('validate that the proof data contains correct number of proof variables and is well formed', () => {
            const { proofData } = atomicProof.constructAtomicSwap(testNotes);
            expect(proofData.length).to.equal(4);
            expect(proofData[0].length).to.equal(6);
            expect(proofData[1].length).to.equal(6);
            expect(proofData[2].length).to.equal(6);
            expect(proofData[3].length).to.equal(6);
        });

        it('validate that the proof is correct, using the validation algo', () => {
            const { proofData, challenge } = atomicProof.constructAtomicSwap(testNotes);
            const result = atomicProof.verifyAtomicSwap(proofData, challenge);
            expect(result).to.equal(1);
        });
    });

    describe('validate properties of the proof validation algo', () => {
        let proofData;
        let challenge;

        beforeEach(() => {
            const spendingKeys = [
                secp256k1.keyFromPrivate(crypto.randomBytes(32)),
                secp256k1.keyFromPrivate(crypto.randomBytes(32)),
                secp256k1.keyFromPrivate(crypto.randomBytes(32)),
                secp256k1.keyFromPrivate(crypto.randomBytes(32)),
            ];

            const noteValues = [10, 20, 10, 20];

            const testNotes = {
                makerNotes: {
                    bidNote: notes.create(`0x${spendingKeys[0].getPublic(true, 'hex')}`, noteValues[0]),
                    askNote: notes.create(`0x${spendingKeys[1].getPublic(true, 'hex')}`, noteValues[1]),
                },
                takerNotes: {
                    bidNote: notes.create(`0x${spendingKeys[2].getPublic(true, 'hex')}`, noteValues[2]),
                    askNote: notes.create(`0x${spendingKeys[3].getPublic(true, 'hex')}`, noteValues[3]),
                },
            };

            const constructProofData = atomicProof.constructAtomicSwap(testNotes);
            proofData = constructProofData.proofData;
            challenge = constructProofData.challenge;
        });

        it('validate that the kbar relations are satisfied i.e. kbar1 = kbar3 and kbar2 = kbar4', () => {
            const proofDataBn = helpers.convertToBn(proofData);
            const formattedChallenge = new BN(challenge.slice(2), 16);

            const finalHash = new Hash();

            proofDataBn.forEach((proofElement) => {
                finalHash.append(proofElement[6]);
                finalHash.append(proofElement[7]);
            });

            const { recoveredBlindingFactors } = helpers.recoverBlindingFactorsAndChallenge(proofDataBn, formattedChallenge, finalHash);

            const testkBar1 = (recoveredBlindingFactors[0].kBar).toString(16);
            const testkBar2 = (recoveredBlindingFactors[1].kBar).toString(16);
            const testkBar3 = (recoveredBlindingFactors[2].kBar).toString(16);
            const testkBar4 = (recoveredBlindingFactors[3].kBar).toString(16);

            expect(testkBar1).to.equal(testkBar3);
            expect(testkBar2).to.equal(testkBar4);
        });
    });

    describe('validate that proof construction algo is valid, using validation algo', () => {
        let testNotes;

        beforeEach(() => {
            const spendingKeys = [
                secp256k1.keyFromPrivate(crypto.randomBytes(32)),
                secp256k1.keyFromPrivate(crypto.randomBytes(32)),
                secp256k1.keyFromPrivate(crypto.randomBytes(32)),
                secp256k1.keyFromPrivate(crypto.randomBytes(32)),
            ];

            const noteValues = [10, 20, 10, 20];

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

        it('validate that the proof is correct, using the validation algo', () => {
            const { proofData, challenge } = atomicProof.constructAtomicSwap(testNotes);
            const result = atomicProof.verifyAtomicSwap(proofData, challenge);
            expect(result).to.equal(1);
        });
    });
});
