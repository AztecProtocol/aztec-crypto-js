/* global, beforeEach, it:true */
const BN = require('bn.js');
const chai = require('chai');
const web3Utils = require('web3-utils');

const bilateralProof = require('./bilateralSwapProof');
const helpers = require('./helpers');
const Hash = require('../utils/keccak');


const { expect } = chai;


describe('Validating bilateral swap proof construction and verification algos', () => {
    describe('Validate properties of the proof construction algo', () => {
        let testNotes;
        let sender;

        beforeEach(() => {
            testNotes = helpers.makeTestNotes([10, 20], [10, 20]);

            // Dummy, random sender address for proof of concept
            sender = web3Utils.randomHex(20);
        });

        it('validate that the bilateral swap blinding scalar relations are satisfied i.e. bk1 = bk3 and bk2 = bk4', () => {
            const finalHash = new Hash();

            testNotes.forEach((note) => {
                finalHash.append(note.gamma);
                finalHash.append(note.sigma);
            });

            const { blindingFactors } = helpers.getBlindingFactorsAndChallenge(testNotes, finalHash);

            const testk1 = (blindingFactors[0].bk).toString(16);
            const testk2 = (blindingFactors[1].bk).toString(16);
            const testk3 = (blindingFactors[2].bk).toString(16);
            const testk4 = (blindingFactors[3].bk).toString(16);

            expect(testk1).to.equal(testk3);
            expect(testk2).to.equal(testk4);
        });

        it('validate that the proof data contains correct number of proof variables and is well formed', () => {
            const { proofData } = bilateralProof.constructBilateralSwap(testNotes, sender);
            expect(proofData.length).to.equal(4);
            expect(proofData[0].length).to.equal(6);
            expect(proofData[1].length).to.equal(6);
            expect(proofData[2].length).to.equal(6);
            expect(proofData[3].length).to.equal(6);
        });

        it('validate that the proof is correct, using the validation algo', () => {
            const { proofData, challenge } = bilateralProof.constructBilateralSwap(testNotes, sender);
            const result = bilateralProof.verifyBilateralSwap(proofData, challenge, sender);
            expect(result).to.equal(true);
        });
    });

    describe('validate properties of the proof validation algo', () => {
        let proofData;
        let challenge;
        let sender;

        beforeEach(() => {
            const testNotes = helpers.makeTestNotes([10, 20], [10, 20]);

            // Dummy, random sender address for proof of concept
            sender = web3Utils.randomHex(20);

            ({ proofData, challenge } = bilateralProof.constructBilateralSwap(testNotes, sender));
        });

        it('validate that the kbar relations are satisfied i.e. kbar1 = kbar3 and kbar2 = kbar4', () => {
            const proofDataBn = helpers.toBnAndAppendPoints(proofData);
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
        let sender;

        beforeEach(() => {
            testNotes = helpers.makeTestNotes([10, 20], [10, 20]);

            // Dummy, random sender address for proof of concept
            sender = web3Utils.randomHex(20);
        });

        it('validate that the proof is correct, using the validation algo', () => {
            const { proofData, challenge } = bilateralProof.constructBilateralSwap(testNotes, sender);
            const result = bilateralProof.verifyBilateralSwap(proofData, challenge, sender);
            expect(result).to.equal(true);
        });
    });
});
