/* global artifacts, expect, contract, beforeEach, it:true */
const BN = require('bn.js');
const { padLeft, sha3 } = require('web3-utils');

const AZTEC = artifacts.require('./contracts/AZTEC/AZTEC');
const AZTECInterface = artifacts.require('./contracts/AZTEC/AZTECInterface');

const aztecProof = require('../../zk-crypto-js/proof/proof');
const { t2, GROUP_MODULUS } = require('../../zk-crypto-js/params');
const exceptions = require('../exceptions');

AZTEC.abi = AZTECInterface.abi;
contract('AZTEC', (accounts) => {
    let aztec;
    beforeEach(async () => {
        aztec = await AZTEC.new(accounts[0]);
    });

    it('succesfully validates an AZTEC JOIN-SPLIT zero-knowledge proof', async () => {
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({ kIn: [11, 22], kOut: [5, 28] });
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, accounts[0], 0);
        const result = await aztec.validateJoinSplit(proofData, m, challenge, t2, {
            from: accounts[0],
            gas: 4000000,
        });
        const gasUsed = await aztec.validateJoinSplit.estimateGas(proofData, m, challenge, t2, {
            from: accounts[0],
            gas: 4000000,
        });

        console.log('gas used = ', gasUsed);
        expect(result).to.equal(true);
    });

    it('validates proof where kPublic > 0 and kPublic < n/2', async () => {
        const kPublic = 101;
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({ kIn: [113, 2212], kOut: [2222, 2] });
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, accounts[0], kPublic);
        const result = await aztec.validateJoinSplit(proofData, m, challenge, t2, {
            from: accounts[0],
            gas: 4000000,
        });
        const gasUsed = await aztec.validateJoinSplit.estimateGas(proofData, m, challenge, t2, {
            from: accounts[0],
            gas: 4000000,
        });

        console.log('gas used = ', gasUsed);
        expect(result).to.equal(true);
    });

    it('validates proof where kPublic > n/2', async () => {
        let kPublic = 523;
        kPublic = GROUP_MODULUS.sub(new BN(kPublic));
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({ kIn: [2513, 800, 100], kOut: [3936] });
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, accounts[0], kPublic);
        const result = await aztec.validateJoinSplit(proofData, m, challenge, t2, {
            from: accounts[0],
            gas: 4000000,
        });
        const gasUsed = await aztec.validateJoinSplit.estimateGas(proofData, m, challenge, t2, {
            from: accounts[0],
            gas: 4000000,
        });

        console.log('gas used = ', gasUsed);
        expect(result).to.equal(true);
    });

    it('validates that points are on curve', async () => {
        const zeroes = `${padLeft('0', 64)}`;
        const noteString = `${zeroes}${zeroes}${zeroes}${zeroes}${zeroes}${zeroes}`;
        const challengeString = `0x${padLeft(accounts[0].slice(2), 64)}${padLeft('132', 64)}${padLeft('1', 64)}${noteString}`;
        const challenge = sha3(challengeString, 'hex');
        const m = 1;
        const proofData = [[`0x${padLeft('132', 64)}`, '0x0', '0x0', '0x0', '0x0', '0x0']];

        await exceptions.catchRevert(aztec.validateJoinSplit(proofData, m, challenge, t2, {
            from: accounts[0],
            gas: 4000000,
        }));
    });
});
