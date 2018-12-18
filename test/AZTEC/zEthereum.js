/* global artifacts, expect, contract, beforeEach, it:true */
/* eslint-disable no-console */
const BN = require('bn.js');
const web3Utils = require('web3-utils');

const { getWeb3 } = require('../helpers');

const AZTEC = artifacts.require('./contracts/AZTEC/AZTEC');
const AZTECInterface = artifacts.require('./contracts/AZTEC/AZTECInterface');
const ZEthereum = artifacts.require('./contracts/AZTEC/ZEthereum');

const aztecProof = require('../../aztec-crypto-js/proof/proof');
const secp256k1 = require('../../aztec-crypto-js/secp256k1/secp256k1');
const sign = require('../../aztec-crypto-js/utils/sign');

const { t2, GROUP_MODULUS } = require('../../aztec-crypto-js/params');

// Step 1: make a token contract
// Step 2: make an aztec token contract
// Step 3: assign tokens from the token contract
// Step 4: blind tokens into note form
// Step 5: issue a join split transaction of confidential notes
// Step 6: redeem tokens from confidential form

const web3 = getWeb3();
const zEthereumToEthereum = new BN('10000000000000000', 10);

AZTEC.abi = AZTECInterface.abi;

const fakeNetworkId = 100;

contract('ZEthereum Tests', (accounts) => {
    let aztec;
    let zEthereum;
    let aztecAccounts = [];
    let initialCommitments;
    let phaseTwoCommitments;
    before(async () => {
        aztec = await AZTEC.new(accounts[0]);
        ZEthereum.link('AZTECInterface', aztec.address);

        zEthereum = await ZEthereum.new(t2, fakeNetworkId, {
            from: accounts[0],
            gas: 5000000,
        });

        const receipt = await web3.eth.getTransactionReceipt(zEthereum.transactionHash);
        console.log('gas spent creating contract = ', receipt.gasUsed);

        aztecAccounts = accounts.map(() => secp256k1.generateAccount());
    });

    it('successfully blinds 10 ethereum into 5 zero-knowledge notes', async () => {
        const initialBalance = new BN(await web3.eth.getBalance(accounts[0]));
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({ kIn: [], kOut: [90, 110, 100, 130, 570] });
        initialCommitments = commitments;
        const kPublic = GROUP_MODULUS.sub(new BN(1000));
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, accounts[0], kPublic);
        const outputOwners = aztecAccounts.slice(0, 5).map(account => account.address);
        // const result = await zEthereum.confidentialTransfer(proofData, m, challenge, [], outputOwners, '0x', {
        const transactionData = web3.eth.abi.encodeParameters(
            ['bytes32[6][]', 'uint', 'uint', 'bytes32[3][]'],
            [proofData, m, challenge, []]
        );
        const result = await zEthereum.confidentialTransaction(transactionData, outputOwners, '0x', {
            from: accounts[0],
            gas: 5400000,
            value: new BN(1000).mul(zEthereumToEthereum),
        });
        const { gasPrice } = await web3.eth.getTransaction(result.tx);

        const weiSpent = new BN(result.receipt.gasUsed, 10).mul(new BN(gasPrice));

        const finalBalance = new BN(await web3.eth.getBalance(accounts[0]));

        const balanceDifference = initialBalance.sub(finalBalance).sub(weiSpent);

        expect(balanceDifference.eq(new BN(web3Utils.toWei('10', 'ether')))).to.equal(true);

        console.log('gas spent = ', result.receipt.gasUsed);
    });

    it('succesfully enacts a join split transaction, splitting a 100, 130 notes into a 30, 200 notes', async () => {
        const { commitments: outputCommitments } = await aztecProof.constructModifiedCommitmentSet({
            kIn: [],
            kOut: [30, 200],
        });
        phaseTwoCommitments = outputCommitments;
        const commitments = [initialCommitments[2], initialCommitments[3], ...outputCommitments];
        const m = 2;
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, accounts[0], 0);
        const signatures = [
            sign.signNote(proofData[0], challenge, accounts[0], zEthereum.address, aztecAccounts[2].privateKey, fakeNetworkId),
            sign.signNote(proofData[1], challenge, accounts[0], zEthereum.address, aztecAccounts[3].privateKey, fakeNetworkId),
        ].map(r => r.signature);

        const outputOwners = [aztecAccounts[0].address, aztecAccounts[2].address];

        // const result = await zEthereum.confidentialTransfer(proofData, m, challenge, signatures, outputOwners, '0x');
        const transactionData = web3.eth.abi.encodeParameters(
            ['bytes32[6][]', 'uint', 'uint', 'bytes32[3][]'],
            [proofData, m, challenge, signatures]
        );
        const result = await zEthereum.confidentialTransaction(transactionData, outputOwners, '0x');
        console.log('gas spent = ', result.receipt.gasUsed);
    });


    it('succesfully enacts a join split transaction, redeeming 119 tokens', async () => {
        const initialBalance = new BN(await web3.eth.getBalance(accounts[3]));
        const { commitments: outputCommitments } = await aztecProof.constructModifiedCommitmentSet({ kIn: [], kOut: [1] });
        const commitments = [initialCommitments[0], phaseTwoCommitments[0], ...outputCommitments];
        const m = 2;
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, accounts[3], 119);
        const signatures = [
            sign.signNote(proofData[0], challenge, accounts[3], zEthereum.address, aztecAccounts[0].privateKey, fakeNetworkId),
            sign.signNote(proofData[1], challenge, accounts[3], zEthereum.address, aztecAccounts[0].privateKey, fakeNetworkId),
        ].map(r => r.signature);
        const outputOwners = [aztecAccounts[0].address];
        // const result = await zEthereum.confidentialTransfer(proofData, m, challenge, signatures, outputOwners, '0x', {
        const transactionData = web3.eth.abi.encodeParameters(
            ['bytes32[6][]', 'uint', 'uint', 'bytes32[3][]'],
            [proofData, m, challenge, signatures]
        );
        const result = await zEthereum.confidentialTransaction(transactionData, outputOwners, '0x', {
            from: accounts[3],
            gas: 5000000,
        });

        const { gasPrice } = await web3.eth.getTransaction(result.tx);
        const weiSpent = new BN(result.receipt.gasUsed, 10).mul(new BN(gasPrice));
        const finalBalance = new BN(await web3.eth.getBalance(accounts[3]));
        const balanceDifference = finalBalance.sub(initialBalance.sub(weiSpent));

        expect(balanceDifference.eq(new BN(web3Utils.toWei('1.19', 'ether')))).to.equal(true);
        console.log('gas spent = ', result.receipt.gasUsed);
    });
});
