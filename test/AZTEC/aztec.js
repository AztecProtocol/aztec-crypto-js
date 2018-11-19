/* global artifacts, expect, contract, beforeEach, it:true */
const BN = require('bn.js');
const { padLeft, sha3 } = require('web3-utils');
const crypto = require('crypto');

const AZTEC = artifacts.require('./contracts/AZTEC/AZTEC');
const AZTECInterface = artifacts.require('./contracts/AZTEC/AZTECInterface');
const exceptions = require('../exceptions');

const aztecProof = require('../../zk-crypto-js/proof/proof');
const { t2Formatted, GROUP_MODULUS } = require('../../zk-crypto-js/params');
const { toBytes32 } = require('../../zk-crypto-js/utils/utils');

AZTEC.abi = AZTECInterface.abi;

contract.only('AZTEC', (accounts) => {
    let aztec;

    // Creating a collection of tests that should pass
    describe('success states', () => {
        beforeEach(async () => {
            // Create a new test environmentn for each test
            aztec = await AZTEC.new(accounts[0]); 
        });

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

        it('validates proof where kPublic > 0 and kPublic < n/2', async () => {
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

        it('validates proof where kPublic > n/2', async () => {
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
    });

    // Creating a collection of tests that should fail
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
            // Creating a set of commitments and messages
            const {
                commitments,
                m,
            } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [11, 22],
                kOut: [5, 28],
            });
            // Creating the proof data and challenge. Proof data contains:
            // k_i, a_i, gamma (x and y coords), sigma (x and y coords)

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

