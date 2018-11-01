/* global artifacts, assert, contract, beforeEach, it:true */
const AZTEC = artifacts.require('./contracts/AZTEC/AZTEC');
const AZTECInterface = artifacts.require('./contracts/AZTEC/AZTECInterface');

const aztecProof = require('../../zk-crypto-js/proof/proof');
const utils = require('../../zk-crypto-js/utils/utils');
const { t2Formatted, GROUP_MODULUS } = require('../../zk-crypto-js/params');
const { toBytes32, bnToHex } = utils;
const BN = require('bn.js');

AZTEC.abi = AZTECInterface.abi;
contract('AZTEC', (accounts) => {
    let aztec;
    beforeEach(async () => {
        aztec = await AZTEC.new(accounts[0]);
    });

    it('succesfully validates an AZTEC JOIN-SPLIT zero-knowledge proof', async () => {
        let gas = 0;
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({ kIn: [11, 22 ], kOut: [ 5, 28 ]});
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, 0);
        const result = await aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
            from: accounts[0],
            gas: 4000000,
        });
        assert(result === true);
    });

    it('validates proof where kPublic > 0 and kPublic < n/2', async () => {
        let gas = 0;
        let kPublic = 101;
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({ kIn: [113, 2212 ], kOut: [ 2222, 2 ]});
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, kPublic);
        const result = await aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
            from: accounts[0],
            gas: 4000000,
        });
        assert(result === true);
    });

    it('validates proof where kPublic > n/2', async () => {
        let gas = 0;
        let kPublic = 523;
        kPublic = GROUP_MODULUS.sub(new BN(kPublic));
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({ kIn: [2513, 800, 100 ], kOut: [ 3936 ]});
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, kPublic);

        const result = await aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
            from: accounts[0],
            gas: 4000000,
        });
        assert(result === true);
    });
});
