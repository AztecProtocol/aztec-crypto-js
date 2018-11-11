/* global artifacts, expect, contract, beforeEach, it:true */
const BN = require('bn.js');

const AZTEC = artifacts.require('./contracts/AZTEC/AZTEC');
const AZTECInterface = artifacts.require('./contracts/AZTEC/AZTECInterface');

const aztecProof = require('../../zk-crypto-js/proof/proof');
const { t2Formatted, GROUP_MODULUS } = require('../../zk-crypto-js/params');

AZTEC.abi = AZTECInterface.abi;
contract('AZTEC', (accounts) => {
    let aztec;
    beforeEach(async () => {
        aztec = await AZTEC.new(accounts[0]);
    });

    it('succesfully validates an AZTEC JOIN-SPLIT zero-knowledge proof', async () => {
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({ kIn: [11, 22], kOut: [5, 28] });
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, accounts[0], 0);
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
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({ kIn: [113, 2212], kOut: [2222, 2] });
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, accounts[0], kPublic);
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
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({ kIn: [2513, 800, 100], kOut: [3936] });
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, accounts[0], kPublic);
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
