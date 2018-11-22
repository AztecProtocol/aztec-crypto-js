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

const { t2Formatted, GROUP_MODULUS } = require('../../zk-crypto-js/params');


contract('AZTEC - ERC20 Token Bridge Tests', (accounts) => {
    let aztec;
    let aztecToken;
    let token;
    let aztecAccounts = [];
    let initialCommitments;
    let phaseTwoCommitments;
    let scalingFactor;
    const tokensTransferred = new BN(100000); // defining total value of tokens to be transferred

    describe.only('failure cases', () => {
        beforeEach(async () => {
            // Initialise the AZTEC contract and populate accounts with ecdsa key pairs 
            token = await ERC20Mintable.new(); // this is a function to mint new ERC20 tokens. But I'm not sure about the value? Where do we define the value of these tokens?
            aztec = await AZTEC.new(accounts[0]); // creating a new AZTEC token contract, with the first account entry in the input
            AZTECERC20Bridge.link('AZTECInterface', aztec.address); // linking the address to the library

            aztecToken = await AZTECERC20Bridge.new(t2Formatted, token.address, {
                from: accounts[0],
                gas: 5000000,
            }); // creating an instance of the contract that bridges between ERC20 and AZTEC. aztecToken is the smart contract
            scalingFactor = await aztecToken.scalingFactor(); // to convert between ERC20 and AZTEC, because they are in different denominations
            const receipt = await web3.eth.getTransactionReceipt(aztecToken.transactionHash); // gives you a breakdown of the tx details e.g. block number, gas used etc.
    
            aztecAccounts = accounts.map(() => ecdsa.generateKeyPair()); // populates accounts with an ecdsa created key pair
            // Each aztec account contains 4 properties: 1) publicKey, 2) EC point x, 3) privateKey, 4) account address

            //console.log('AZTEC accounts:', aztecAccounts);
            await Promise.all(accounts.map(account => token.mint( // token.mint takes 2 arguments: 1) address to send the value to, 2) the value of the tokens being created
                account, // specifying the account from which the token is to be minted. Where is this account specified?
                scalingFactor.mul(tokensTransferred), // specifying the value to be transferred to the account. Think we're transferring all tolens to
                { from: accounts[0], gas: 5000000 } 
            )));
            await Promise.all(accounts.map(account => token.approve( // Have to give approval to spend tokens
                aztecToken.address,
                scalingFactor.mul(tokensTransferred),
                { from: account, gas: 5000000 }
            ))); // approving tokens

            // Distribute 100,000 ERC20 tokens into note format - sending to 5 adresses 
            const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({
                kIn: [],
                kOut: [9000, 11000, 10000, 13000, 57000],
            }); // created the commitments
            initialCommitments = commitments;

            const kPublic = GROUP_MODULUS.sub(tokensTransferred); // kPublic is negative - so converting public tokens into AZTEC notes
            const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, accounts[0], kPublic); // outputting the proof data
            const outputOwners = aztecAccounts.slice(0, 5).map(account => account.address); // determining 5 accounts that will be the owners of the notes 

            const result = await aztecToken.confidentialTransaction(proofData, m, challenge, [], outputOwners, '0x'); // executes the confidential transaction
            // Each output note has an associated outputOwner - they are distributed to the addresses by this line
            // result = transaction receipt, gives a log of what happened
            const balance = await token.balanceOf(aztecToken.address); // this is the balance of the AZTEC smart contract. The AZTEC smart contract is acting
            // as an esckrow account. It holds onto the note value until you redeem.

            expect(balance.eq(scalingFactor.mul(tokensTransferred))).to.equal(true); // expect the balance of the AZTEC smart contract to equal the value of the tokens transferred
        });
        
        it('validate failure if AZTEC note owner attempts withdrawl greater than note value', async () => {
            const commitment = [initialCommitments[0]]; // taking one input commitment/note (chose the first for convenience). 
            // the constructJoinSplit method requires the commitment argument to be in array format - made it into an array
            const m = 1; // there is only one input note, so m=1

            const kPublic = 9001; // trying to withdraw 1 unit of value more than put in
            const { proofData, challenge } = aztecProof.constructJoinSplit(commitment, m, accounts[0], kPublic); // constructing the proof data
            
            const signatures = [
                sign.signNote(proofData[0], challenge, accounts[0], aztecToken.address, aztecAccounts[0].privateKey), // signing one note
            ].map(r => r.signature);

            await exceptions.catchRevert(aztecToken.confidentialTransaction( // trying to perform the transaction, it should throw an error if someone's taking out more than they have
                proofData, // z-k proof data that was constructed by the constructJoinSplit
                m, // delimiter between input and output notes
                challenge, // random challenge (part of the Schnorr protocol)
                signatures, // input signatures
                [], // output addresses
                '0x',
                { from: accounts[0], gas: 5000000 }
            ));
        });
    });
});
