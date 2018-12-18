/* global artifacts, contract, beforeEach, expect, web3, it:true */
/* eslint-disable no-console */
const BN = require('bn.js');

const AZTEC = artifacts.require('./contracts/AZTEC/AZTEC');
const AZTECInterface = artifacts.require('./contracts/AZTEC/AZTECInterface');
const AZTECERC20Bridge = artifacts.require('./contracts/AZTEC/AZTECERC20BridgeAsm');
const ERC20Mintable = artifacts.require('./contracts/ERC20/ERC20Mintable');
AZTEC.abi = AZTECInterface.abi; // hon hon hon

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

contract('AZTEC - ERC20 Token Bridge (assembly) Tests', (accounts) => {
    let aztec;
    let aztecToken;
    let token;
    let aztecAccounts = [];
    let initialCommitments;
    let phaseTwoCommitments;
    const fakeNetworkId = 100;
    before(async () => {
        token = await ERC20Mintable.new();
        aztec = await AZTEC.new(accounts[0]);
        AZTECERC20Bridge.link('AZTECInterface', aztec.address);

        aztecToken = await AZTECERC20Bridge.new(t2, token.address, fakeNetworkId, {
            from: accounts[0],
            gas: 5000000,
        });

        const receipt = await web3.eth.getTransactionReceipt(aztecToken.transactionHash);
        console.log('gas spent creating contract = ', receipt.gasUsed);

        aztecAccounts = accounts.map(() => secp256k1.generateAccount());
        await Promise.all(accounts.map(account => token.mint(account, 1000000, { from: accounts[0], gas: 5000000 })));
        await Promise.all(accounts.map(account => token.approve(aztecToken.address, 1000000, { from: account, gas: 5000000 })));
    });

    it('successfully blinds 100000 tokens into 5 zero-knowledge notes', async () => {
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({
            kIn: [],
            kOut: [9000, 11000, 10000, 13000, 57000],
        });

        initialCommitments = commitments;
        const kPublic = GROUP_MODULUS.sub(new BN(100000));
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, accounts[0], kPublic);
        const outputOwners = aztecAccounts.slice(0, 5).map(account => account.address);
        const result = await aztecToken.confidentialTransfer(proofData, m, challenge, [], outputOwners, '0x', {
            from: accounts[0],
            gas: 5000000,
        });
        const balance = await token.balanceOf(aztecToken.address);

        expect(balance.eq(new BN(100000))).to.equal(true);
        console.log('gas spent = ', result.receipt.gasUsed);
    });

    it('succesfully enacts a join split transaction, splitting a 10000, 13000 notes into a 3000, 20000 notes', async () => {
        const { commitments: outputCommitments } = await aztecProof.constructModifiedCommitmentSet({
            kIn: [],
            kOut: [3000, 20000],
        });
        phaseTwoCommitments = outputCommitments;
        const commitments = [initialCommitments[2], initialCommitments[3], ...outputCommitments];
        const m = 2;
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, accounts[0], 0);
        const signatures = [
            sign.signNote(proofData[0], challenge, accounts[0], aztecToken.address, aztecAccounts[2].privateKey, fakeNetworkId),
            sign.signNote(proofData[1], challenge, accounts[0], aztecToken.address, aztecAccounts[3].privateKey, fakeNetworkId),
        ].map(r => r.signature);

        const outputOwners = [aztecAccounts[0].address, aztecAccounts[2].address];
        const result = await aztecToken.confidentialTransfer(proofData, m, challenge, signatures, outputOwners, '0x');
        console.log('gas spent = ', result.receipt.gasUsed);
    });

    it('succesfully enacts a join split transaction, redeeming 11999 tokens', async () => {
        const { commitments: outputCommitments } = await aztecProof.constructModifiedCommitmentSet({ kIn: [], kOut: [1] });
        const commitments = [initialCommitments[0], phaseTwoCommitments[0], ...outputCommitments];
        const m = 2;
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, accounts[3], 11999);
        const signatures = [
            sign.signNote(proofData[0], challenge, accounts[3], aztecToken.address, aztecAccounts[0].privateKey, fakeNetworkId),
            sign.signNote(proofData[1], challenge, accounts[3], aztecToken.address, aztecAccounts[0].privateKey, fakeNetworkId),
        ].map(result => result.signature);
        const result = await aztecToken.confidentialTransfer(
            proofData,
            m,
            challenge,
            signatures,
            [aztecAccounts[0].address],
            '0x',
            { from: accounts[3], gas: 5000000 }
        );
        const userBalance = await token.balanceOf(accounts[3]);
        const contractBalance = await token.balanceOf(aztecToken.address);
        expect(userBalance.eq(new BN(1011999))).to.equal(true);
        const balance = 100000 - 11999;
        expect(contractBalance.eq(new BN(balance))).to.equal(true);
        console.log('gas spent = ', result.receipt.gasUsed);
    });
});
