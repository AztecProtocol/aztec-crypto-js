/* global artifacts, expect, contract, beforeEach, it:true */
const BN = require('bn.js');
const { padLeft, sha3 } = require('web3-utils');
const crypto = require('crypto');

const AZTEC = artifacts.require('./contracts/AZTEC/AZTEC');
const AZTECInterface = artifacts.require('./contracts/AZTEC/AZTECInterface');
const exceptions = require('../exceptions');

const aztecProof = require('../../zk-crypto-js/proof/proof');
const aztecFakeProof = require('../../zk-crypto-js/proof/fakeProof/fakeProof'); // Proofs constructed using a fake setup key

const {
    t2Formatted,
    GROUP_MODULUS,
    FIELD_MODULUS,
} = require('../../zk-crypto-js/params');
const { toBytes32 } = require('../../zk-crypto-js/utils/utils');

AZTEC.abi = AZTECInterface.abi;

contract('AZTEC', (accounts) => {
    let aztec;
    // Creating a collection of tests that should pass
    describe('success states', () => {
        beforeEach(async () => {
            aztec = await AZTEC.new(accounts[0]);
        });

        /*
        General structure of the success state unit tests:
        1) Construct the commitments from a selection of k_in and k_out (input and output values)
        2) Generate the proofData and random challenge. Proof data contains notes, and each note contains 6 pieces of information:
            a) gamma_x
            b) gamma_y
            c) sigma_x
            d) sigma_y
            e) k^bar
            f) a^bar
            Note: a), b), c) and d) are the Pedersen commitment data
            Note: Syntax to access proof data for one note: proofData[]. Syntax to access gamma_x for a particular note: proofData[][0]
        3) Validate that these result in a successfull join-split transaction
        4) Calculate the gas used in validating this join-split transaction
        */

        it('succesfully validates an AZTEC JOIN-SPLIT zero-knowledge proof', async () => {
            const {
                commitments,
                m,
            } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [11, 22],
                kOut: [5, 28],
            });

            const {
                proofData,
                challenge,
            } = aztecProof.constructJoinSplit(commitments, m, accounts[0], 0);
            const result = await aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });
            const gasUsed = await aztec.validateJoinSplit.estimateGas(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });

            console.log('gas used = ', gasUsed);
            expect(result).to.equal(true);
        });

        it('validates proof where kPublic > 0 and kPublic < GROUP_MODULUS/2', async () => { 
            const kPublic = 101;
            const {
                commitments,
                m,
            } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [113, 2212],
                kOut: [2222, 2],
            });
            const {
                proofData,
                challenge,
            } = aztecProof.constructJoinSplit(commitments, m, accounts[0], kPublic);
            const result = await aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });
            const gasUsed = await aztec.validateJoinSplit.estimateGas(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });

            console.log('gas used = ', gasUsed);
            expect(result).to.equal(true);
        });

        it('validates proof where kPublic > GROUP_MODULUS/2', async () => {
            let kPublic = 523; 
            kPublic = GROUP_MODULUS.sub(new BN(kPublic));
            const {
                commitments,
                m,
            } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [2513, 800, 100],
                kOut: [3936],
            });
            const {
                proofData,
                challenge,
            } = aztecProof.constructJoinSplit(commitments, m, accounts[0], kPublic);
            const result = await aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });
            const gasUsed = await aztec.validateJoinSplit.estimateGas(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });

            console.log('gas used = ', gasUsed);
            expect(result).to.equal(true);
        });

        it('validates that large numbers of input/output notes work', async () => {
            let kPublic = 0;
            kPublic = GROUP_MODULUS.sub(new BN(kPublic));
            const {
                commitments,
                m,
            } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [200, 50, 400, 250, 600],
                kOut: [350, 150, 700, 150, 150],
            });
            const {
                proofData,
                challenge,
            } = aztecProof.constructJoinSplit(commitments, m, accounts[0], kPublic);
            const result = await aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });
            const gasUsed = await aztec.validateJoinSplit.estimateGas(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });

            console.log('gas used = ', gasUsed);
            expect(result).to.equal(true);
        });

        it('validate that zero quantity of input notes works', async () => {
            let kPublic = 33;

            kPublic = GROUP_MODULUS.sub(new BN(kPublic)); 
            const {
                commitments,
                m,
            } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [],
                kOut: [5, 28],
            });
            const {
                proofData,
                challenge,
            } = aztecProof.constructJoinSplit(commitments, m, accounts[0], kPublic);
            const result = await aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });
            const gasUsed = await aztec.validateJoinSplit.estimateGas(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });

            console.log('gas used = ', gasUsed);
            expect(result).to.equal(true);
        });

        it('validate that zero quantity of output notes works', async () => {
            let kPublic = 33; 

            const {
                commitments,
                m,
            } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [5, 28],
                kOut: [0],
            });
            const {
                proofData,
                challenge,
            } = aztecProof.constructJoinSplit(commitments, m, accounts[0], kPublic);
            const result = await aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });
            const gasUsed = await aztec.validateJoinSplit.estimateGas(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });

            console.log('gas used = ', gasUsed);
            expect(result).to.equal(true);
        });

        it('validate that notes of zero value work', async () => {
            let kPublic = 0; 

            const {
                commitments,
                m,
            } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [5, 28, 0],
                kOut: [5, 0, 28],
            });
            const {
                proofData,
                challenge,
            } = aztecProof.constructJoinSplit(commitments, m, accounts[0], kPublic);
            const result = await aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });
            const gasUsed = await aztec.validateJoinSplit.estimateGas(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });

            console.log('gas used = ', gasUsed);
            expect(result).to.equal(true);
        });
        
        it('validate that zero quantity of output notes works', async () => {
            let kPublic = 33;

            const {
                commitments,
                m,
            } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [5, 28],
                kOut: [],
            });
            const {
                proofData,
                challenge,
            } = aztecProof.constructJoinSplit(commitments, m, accounts[0], kPublic);
            const result = await aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });
            const gasUsed = await aztec.validateJoinSplit.estimateGas(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            });

            console.log('gas used = ', gasUsed);
            expect(result).to.equal(true);
        });      
    });

    describe('failure states', () => {
        beforeEach(async () => {
            aztec = await AZTEC.new(accounts[0]);
        });

        it('validates failure when using a fake challenge', async () => {
            const {
                commitments,
                m,
            } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [11, 22],
                kOut: [5, 28],
            });

            const {
                proofData,
            } = aztecProof.constructJoinSplit(commitments, m, accounts[0], 0);
            const fakeChallenge = new BN(crypto.randomBytes(32), 16).umod(GROUP_MODULUS).toString(10);

            exceptions.catchRevert(aztec.validateJoinSplit(proofData, m, fakeChallenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            }));
        });

        it('validates failure for random proof data', async () => {
            const {
                commitments,
                m,
            } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [11, 22],
                kOut: [5, 28],
            });

            const {
                proofData,
                challenge,
            } = aztecProof.constructJoinSplit(commitments, m, accounts[0], 0);
            const fakeProofData = new Array(4).map(() => new Array(6).map(() => toBytes32.randomBytes32()));
            exceptions.catchRevert(aztec.validateJoinSplit(fakeProofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            }));
        });

        it('validate failure for zero input note value', async () => {
            const {
                commitments,
                m,
            } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [0, 0],
                kOut: [5, 28],
            });

            const {
                proofData,
                challenge,
            } = aztecProof.constructJoinSplit(commitments, m, accounts[0], 0);

            exceptions.catchRevert(aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            }));
        });
    
        it('validate failure for zero ouput note value', async () => {
            const {
                commitments,
                m,
            } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [11, 22],
                kOut: [0, 0],
            });

            const {
                proofData,
                challenge,
            } = aztecProof.constructJoinSplit(commitments, m, accounts[0], 0);

            exceptions.catchRevert(aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            }));
        });

        it('validate failure when using a fake trusted setup key', async () => {
            const {
                commitments,
                m,
            } = await aztecFakeProof.constructModifiedCommitmentSet({
                kIn: [11, 22],
                kOut: [5, 28],
            });

            const {
                proofData,
                challenge,
            } = aztecProof.constructJoinSplit(commitments, m, accounts[0], 0);

            exceptions.catchRevert(aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
                from: accounts[0],
                gas: 4000000,
            }));
        });
    });

    it('validates that points are on curve', async () => {
        const zeroes = `${padLeft('0', 64)}`;
        const noteString = `${zeroes}${zeroes}${zeroes}${zeroes}${zeroes}${zeroes}`;
        const challengeString = `0x${padLeft(accounts[0].slice(2), 64)}${padLeft('132', 64)}${padLeft('1', 64)}${noteString}`;
        const challenge = sha3(challengeString, 'hex');
        const m = 1;
        const proofData = [[`0x${padLeft('132', 64)}`, '0x0', '0x0', '0x0', '0x0', '0x0']];

        await exceptions.catchRevert(aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
            from: accounts[0],
            gas: 4000000,
        }));
    });
});
