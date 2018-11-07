/* global artifacts, assert, contract, beforeEach, it:true */
const AZTEC = artifacts.require('./contracts/AZTEC/AZTEC');
const AZTECInterface = artifacts.require('./contracts/AZTEC/AZTECInterface');
const ZEthereum = artifacts.require('./contracts/AZTEC/ZEthereum');

const aztecProof = require('../../zk-crypto-js/proof/proof');
const ecdsa = require('../../zk-crypto-js/secp256k1/ecdsa');
const utils = require('../../zk-crypto-js/utils/utils');
const sign = require('../../zk-crypto-js/utils/sign');

const { t2Formatted, GROUP_MODULUS } = require('../../zk-crypto-js/params');
const { toBytes32, bnToHex } = utils;
const BN = require('bn.js');

// Step 1: make a token contract
// Step 2: make an aztec token contract
// Step 3: assign tokens from the token contract
// Step 4: blind tokens into note form
// Step 5: issue a join split transaction of confidential notes
// Step 6: redeem tokens from confidential form
const zEthereumToEthereum = new BN('10000000000000000', 10);

AZTEC.abi = AZTECInterface.abi;
contract('ZEthereum Tests', (accounts) => {
    let aztec;
    let aztecToken;
    let token;
    let aztecAccounts = [];
    let initialCommitments;
    let phaseTwoCommitments;
    before(async () => {
        aztec = await AZTEC.new(accounts[0]);
        zEthereum = await ZEthereum.new(t2Formatted, aztec.address, {
            from: accounts[0],
            gas: 5000000,
        });
        for (let i = 0; i < 10; i += 1) {
            aztecAccounts[i] = ecdsa.generateKeyPair();
        }
    });

    it('successfully blinds 10 ethereum into 5 zero-knowledge notes', async () => {
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({ kIn: [], kOut: [ 90, 110, 100, 130, 570 ]});
        initialCommitments = commitments;
        kPublic = GROUP_MODULUS.sub(new BN(1000));
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, kPublic);
        const outputOwners = [aztecAccounts[0].address, aztecAccounts[1].address, aztecAccounts[2].address, aztecAccounts[3].address, aztecAccounts[4].address];
        const result = await zEthereum.confidentialTransaction(proofData, m, challenge, [], outputOwners, {
            from: accounts[0],
            gas: 1400000,
            value: new BN(1000).mul(zEthereumToEthereum)
        });
        // 100026000000000000000
        // 99955512420000000000
        console.log(accounts[0]);
        // const balance = await aztecToken.balanceOf(aztecToken.address);
        console.log('gas spent = ', result.receipt.gasUsed);
        // console.log(result.logs[0].args);
        // expect(balance.eq(new BN(100000))).to.equal(true);
    });
    /*
    it('succesfully enacts a join split transaction, splitting a 10000 note into a 3000 and 7000 note', async () => {
        let { commitments: outputCommitments } = await aztecProof.constructModifiedCommitmentSet({ kIn: [], kOut: [ 3000, 7000 ]});
        let inputCommitment = initialCommitments[2];
        phaseTwoCommitments = outputCommitments;
        const commitments = [inputCommitment, ...outputCommitments ];
        const m = 1;
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, 0);
        const hash = web3.eth.abi.encodeParameters(['bytes32[4]'], [[ proofData[0][2], proofData[0][3], proofData[0][4], proofData[0][5]]]);

        const firstSignature = sign.signNote(proofData[0], challenge, accounts[0], aztecToken.address, aztecAccounts[2].privateKey);
        const inputSignatures = [firstSignature.signature];
        const outputOwners = [aztecAccounts[0].address, aztecAccounts[2].address];
        const result = await aztecToken.confidentialTransaction(proofData, m, challenge, inputSignatures, outputOwners);
        console.log('gas spent = ', result.receipt.gasUsed);

    });

    it('succesfully enacts a join split transaction, redeeming 11999 tokens', async () => {
        let { commitments: outputCommitments } = await aztecProof.constructModifiedCommitmentSet({ kIn: [], kOut: [1] });
        let inputCommitments = [initialCommitments[0], phaseTwoCommitments[0]];
        const commitments = [...inputCommitments, ...outputCommitments ];
        const m = 2;
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, 11999);
        const hashA = web3.eth.abi.encodeParameters(['bytes32[4]'], [[ proofData[0][2], proofData[0][3], proofData[0][4], proofData[0][5]]]);
        const hashB = web3.eth.abi.encodeParameters(['bytes32[4]'], [[ proofData[1][2], proofData[1][3], proofData[1][4], proofData[1][5]]]);
        const firstSignature = sign.signNote(proofData[0], challenge, accounts[3], aztecToken.address, aztecAccounts[0].privateKey);
        const secondSignature = sign.signNote(proofData[1], challenge, accounts[3], aztecToken.address, aztecAccounts[0].privateKey);
        const inputSignatures = [firstSignature.signature, secondSignature.signature];
        const outputOwners = [aztecAccounts[0].address];
        const result = await aztecToken.confidentialTransaction(proofData, m, challenge, inputSignatures, outputOwners, {
            from: accounts[3],
            gas: 5000000,
        });
        const userBalance = await aztecToken.balanceOf(accounts[3]);
        const contractBalance = await aztecToken.balanceOf(aztecToken.address);
        expect(userBalance.eq(new BN(1011999))).to.equal(true);
        expect(contractBalance.eq(new BN(100000 - 11999))).to.equal(true);
        console.log('gas spent = ', result.receipt.gasUsed);

    });
*/
});
