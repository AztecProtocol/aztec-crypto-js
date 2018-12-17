/* global artifacts, contract, beforeEach, expect, web3, it:true */
/* eslint-disable no-console */
const BN = require('bn.js');

const AZTEC = artifacts.require('./contracts/AZTEC/AZTEC');
const AZTECInterface = artifacts.require('./contracts/AZTEC/AZTECInterface');
const AZTECERC20Bridge = artifacts.require('./contracts/AZTEC/AZTECERC20Bridge');
const ERC20Mintable = artifacts.require('./contracts/ERC20/ERC20Mintable');

AZTEC.abi = AZTECInterface.abi; // hon hon hon

const exceptions = require('../exceptions');
const aztecProof = require('../../zk-crypto-js/proof/proof');
const ecdsa = require('../../zk-crypto-js/secp256k1/ecdsa');
const sign = require('../../zk-crypto-js/utils/sign');

const { t2, GROUP_MODULUS } = require('../../zk-crypto-js/params');


contract('AZTEC - ERC20 Token Bridge Tests', (accounts) => {
    let aztec;
    let aztecToken;
    let token;
    let aztecAccounts = [];
    let initialCommitments;
    let phaseTwoCommitments;
    let scalingFactor;
    let outputOwners;
    const tokensTransferred = new BN(100000); 

    describe('failure cases', () => {
        beforeEach(async () => {
            token = await ERC20Mintable.new();
            aztec = await AZTEC.new(accounts[0]);
            AZTECERC20Bridge.link('AZTECInterface', aztec.address);

            aztecToken = await AZTECERC20Bridge.new(t2, token.address, {
                from: accounts[0],
                gas: 5000000,
            });
            scalingFactor = await aztecToken.scalingFactor();
            const receipt = await web3.eth.getTransactionReceipt(aztecToken.transactionHash);
    
            aztecAccounts = accounts.map(() => ecdsa.generateKeyPair());

            await Promise.all(accounts.map(account => token.mint(
                account,
                scalingFactor.mul(tokensTransferred),
                { from: accounts[0], gas: 5000000 } 
            )));
            await Promise.all(accounts.map(account => token.approve(
                aztecToken.address,
                scalingFactor.mul(tokensTransferred),
                { from: account, gas: 5000000 }
            )));

            const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [],
                kOut: [9000, 11000, 10000, 13000, 57000],
            });
            initialCommitments = commitments;

            const kPublic = GROUP_MODULUS.sub(tokensTransferred);
            const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, accounts[0], kPublic);
            outputOwners = aztecAccounts.slice(0, 5).map(account => account.address);
            

            const result = await aztecToken.confidentialTransaction(proofData, m, challenge, [], outputOwners, '0x');
            const balance = await token.balanceOf(aztecToken.address);

            expect(balance.eq(scalingFactor.mul(tokensTransferred))).to.equal(true);
        });
        
        it('validate failure if AZTEC note owner attempts withdrawl greater than note value', async () => {
            const commitment = [initialCommitments[0]];
            const m = 1;

            const kPublic = 9001;
            const { proofData, challenge } = aztecProof.constructJoinSplit(commitment, m, accounts[0], kPublic);
            
            const signatures = [
                sign.signNote(proofData[0], challenge, accounts[0], aztecToken.address, aztecAccounts[0].privateKey),
            ].map(r => r.signature);

            await exceptions.catchRevert(aztecToken.confidentialTransaction(
                proofData,
                m,
                challenge,
                signatures,
                [],
                '0x',
                { from: accounts[0], gas: 5000000 }
            ));
        });

        it('validate failure if msg.sender tries to create note value > their ERC20 balance', async () => {
            const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [],
                kOut: [1],
            });
            const extraToken = new BN('1', 10);
            const kPublic = GROUP_MODULUS.sub(extraToken);

            const { proofData, challenge } = aztecProof.constructJoinSplit(
                commitments,
                m,
                accounts[0],
                kPublic
            );
            const outputOwner = [outputOwners[0]];

            await exceptions.catchRevert(aztecToken.confidentialTransaction(proofData, m, challenge, [], outputOwner, '0x', {
                from: accounts[0],
                gas: 2000000,
            }));
        });
    });
});
