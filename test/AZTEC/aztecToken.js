/* global artifacts, assert, contract, beforeEach, it:true */
const AZTEC = artifacts.require('./contracts/AZTEC/AZTEC');
const AZTECInterface = artifacts.require('./contracts/AZTEC/AZTECInterface');
const AZTECToken = artifacts.require('./contracts/AZTEC/AZTECToken');

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

AZTEC.abi = AZTECInterface.abi;
contract('AZTEC Token Tests', (accounts) => {
    let aztec;
    let aztecToken;
    let token;
    let aztecAccounts = [];
    let initialCommitments;
    let phaseTwoCommitments;
    before(async () => {
        aztec = await AZTEC.new(accounts[0]);
        aztecToken = await AZTECToken.new(t2Formatted, aztec.address, {
            from: accounts[0],
            gas: 5000000,
        });
        for (let i = 0; i < 10; i += 1) {
            aztecAccounts[i] = ecdsa.generateKeyPair();
            await aztecToken.mint(accounts[i], 1000000, {
                from: accounts[0],
                gas: 5000000,
            });
            await aztecToken.approve(aztecToken.address, 1000000, {
                from: accounts[i],
                gas: 5000000,
            });
            const allowance = await aztecToken.allowance(accounts[i], aztecToken.address);
        }
    });

    it('successfully blinds 100000 tokens into 5 zero-knowledge notes', async () => {
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({ kIn: [], kOut: [ 9000, 11000, 10000, 13000, 57000 ]});
        initialCommitments = commitments;
        kPublic = GROUP_MODULUS.sub(new BN(100000));
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, kPublic);
        const outputOwners = [aztecAccounts[0].address, aztecAccounts[1].address, aztecAccounts[2].address, aztecAccounts[3].address, aztecAccounts[4].address];
        const result = await aztecToken.confidentialTransaction(proofData, m, challenge, [], outputOwners);
        const balance = await aztecToken.balanceOf(aztecToken.address);
        expect(balance.eq(new BN(100000))).to.equal(true);
    });

    it('succesfully enacts a join split transaction, splitting a 10000 note and 13000 note into a 3000 and 20000 note', async () => {
        let { commitments: outputCommitments } = await aztecProof.constructModifiedCommitmentSet({ kIn: [], kOut: [ 3000, 20000 ]});
        let inputCommitment = [initialCommitments[2], initialCommitments[3]];
        phaseTwoCommitments = outputCommitments;
        const commitments = [...inputCommitment, ...outputCommitments ];
        const m = 2;
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, 0);
        const hashA = web3.eth.abi.encodeParameters(['bytes32[4]'], [[ proofData[0][2], proofData[0][3], proofData[0][4], proofData[0][5]]]);
        const hashB = web3.eth.abi.encodeParameters(['bytes32[4]'], [[ proofData[1][2], proofData[1][3], proofData[1][4], proofData[1][5]]]);
        const firstSignature = sign.signNote(proofData[0], challenge, accounts[0], aztecToken.address, aztecAccounts[2].privateKey);
        const secondSignature = sign.signNote(proofData[1], challenge, accounts[0], aztecToken.address, aztecAccounts[3].privateKey);

        const inputSignatures = [firstSignature.signature, secondSignature.signature];
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

});
