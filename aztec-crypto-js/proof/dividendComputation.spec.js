/* global, beforeEach, it:true */

const chai = require('chai');
const web3Utils = require('web3-utils');

const dividendComputation = require('./dividendComputation');

const helpers = require('./helpers');


const { expect } = chai;

describe('Validating dividend computation swap proof construction and verification algos', () => {
    describe('Validate properties of the proof construction algo', () => {
        let testNotes;
        let sender;
        let za;
        let zb;

        beforeEach(() => {
            /*
            Test case:
            - k_in = 1000
            - Interest rate = 5%
            - k_out = 50
            - za = 5
            - zb = 100
            */

            testNotes = helpers.makeTestNotes([1000], [50]);
            za = 5;
            zb = 100;

            // Dummy, random sender address for proof of concept
            sender = web3Utils.randomHex(20);
        });

        it('validate that the proof data contains correct number of proof variables and is well formed', () => {
            const { proofData } = dividendComputation.constructProof(testNotes, za, zb, sender);
            expect(proofData.length).to.equal(3);
            expect(proofData[0].length).to.equal(6);
            expect(proofData[1].length).to.equal(6);
            expect(proofData[2].length).to.equal(6);
            expect(proofData[3].length).to.equal(6);
        });

        it('validate that the proof is correct, using the validation algo', () => {
            const { proofData, challenge } = dividendComputation.constructProof(testNotes, za, zb, sender);
            const result = dividendComputation.verifyProof(proofData, challenge, sender, za, zb);
            expect(result).to.equal(1);
        });
    });
});
