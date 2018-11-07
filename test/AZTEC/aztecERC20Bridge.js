/* global artifacts, assert, contract, beforeEach, it:true */
const AZTEC = artifacts.require('./contracts/AZTEC/AZTEC');
const AZTECInterface = artifacts.require('./contracts/AZTEC/AZTECInterface');
const AZTECERC20Bridge = artifacts.require('./contracts/AZTEC/AZTECERC20Bridge');
const ERC20Mintable = artifacts.require('./contracts/ERC20/ERC20Mintable');

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
contract.only('AZTEC - ERC20 Token Bridge Tests', (accounts) => {
    let aztec;
    let aztecToken;
    let token;
    let aztecAccounts = [];
    let initialCommitments;
    let phaseTwoCommitments;
    before(async () => {
        token = await ERC20Mintable.new();
        aztec = await AZTEC.new(accounts[0]);
        aztecToken = await AZTECERC20Bridge.new(t2Formatted, aztec.address, token.address, {
            from: accounts[0],
            gas: 5000000,
        });
        console.log('token address = ', token.address);
        console.log('aztec address = ', aztec.address);
        console.log('aztec token address = ', aztecToken);
        console.log('accounts = ', accounts);
        for (let i = 0; i < 10; i += 1) {
            aztecAccounts[i] = ecdsa.generateKeyPair();
        }

        for (let i = 0; i < accounts.length; i += 1) {
            await token.mint(accounts[i], 1000000, {
                from: accounts[0],
                gas: 5000000,
            });
            await token.approve(aztecToken.address, 1000000, {
                from: accounts[i],
                gas: 5000000,
            })
        }
    });

    it.only('successfully blinds 100000 tokens into 5 zero-knowledge notes', async () => {
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({ kIn: [], kOut: [ 9000, 11000, 10000, 13000, 57000 ]});
        for ({ gamma, sigma, a, k} of commitments) {
            console.log('commitment data');
            console.log('gamma = ', gamma);
            console.log('sigma = ', sigma);
            console.log('a = ', a);
            console.log('k = ', k);
        }
        console.log('###');

        initialCommitments = commitments;
        kPublic = GROUP_MODULUS.sub(new BN(100000));
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, kPublic);
        console.log('proof data = ', proofData);
        console.log('challenge = ', challenge);
        const outputOwners = [aztecAccounts[0].address, aztecAccounts[1].address, aztecAccounts[2].address, aztecAccounts[3].address, aztecAccounts[4].address];
        for (owner of outputOwners) {
            console.log('output owner ', owner);
        }
        const result = await aztecToken.confidentialTransaction(proofData, m, challenge, [], outputOwners);
        const balance = await token.balanceOf(aztecToken.address);
        console.log('gas spent = ', result.receipt.gasUsed);
        console.log(result.logs[0].args);
        expect(balance.eq(new BN(100000))).to.equal(true);
    });

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
        const commitments = [...inputCommitments, ...outputCommitments];
        const m = 2;
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, 11999);
        const firstSignature = sign.signNote(proofData[0], challenge, accounts[3], aztecToken.address, aztecAccounts[0].privateKey);
        const secondSignature = sign.signNote(proofData[1], challenge, accounts[3], aztecToken.address, aztecAccounts[0].privateKey);
        const inputSignatures = [firstSignature.signature, secondSignature.signature];
        const outputOwners = [aztecAccounts[0].address];
        const result = await aztecToken.confidentialTransaction(proofData, m, challenge, inputSignatures, outputOwners, {
            from: accounts[3],
            gas: 5000000,
        });
        const userBalance = await token.balanceOf(accounts[3]);
        const contractBalance = await token.balanceOf(aztecToken.address);
        expect(userBalance.eq(new BN(1011999))).to.equal(true);
        expect(contractBalance.eq(new BN(100000 - 11999))).to.equal(true);
        console.log('gas spent = ', result.receipt.gasUsed);
    });
});
