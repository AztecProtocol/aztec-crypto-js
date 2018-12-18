/* eslint-disable prefer-arrow-callback */
const chai = require('chai');
const crypto = require('crypto');
const BN = require('bn.js');

const db = require('../../db/db');
const basicWallet = require('../../basicWallet/basicWallet');
const erc20 = require('../erc20/erc20');
const aztec = require('../aztec/aztec');
const aztecToken = require('./aztecToken');
const transactions = require('../transactions/transactions');
const noteController = require('../../note/controller');
const proof = require('../../../aztec-crypto-js/proof/proof');
const { GROUP_MODULUS, t2, erc20ScalingFactor: scalingFactor } = require('../../../aztec-crypto-js/params');
const web3 = require('../../web3Listener');

const AZTECERC20Bridge = require('../../../build/contracts/AZTECERC20Bridge');

const { expect } = chai;

describe('aztecToken tests', function describe() {
    this.timeout(10000);
    const wallets = [];
    beforeEach(async () => {
        db.clear();
        wallets[0] = await basicWallet.createFromPrivateKey(`0x${crypto.randomBytes(32).toString('hex')}`, 'testA');
        wallets[1] = await basicWallet.createFromPrivateKey(`0x${crypto.randomBytes(32).toString('hex')}`, 'testB');
        wallets[2] = await basicWallet.createFromPrivateKey(`0x${crypto.randomBytes(32).toString('hex')}`, 'testC');

        const accounts = await web3.eth.getAccounts();
        await Promise.all(wallets.map((wallet) => {
            return web3.eth.sendTransaction({
                from: accounts[0],
                to: wallet.address,
                value: web3.utils.toWei('0.5', 'ether'),
            });
        }));

        await transactions.getTransactionReceipt(
            await erc20.mint(wallets[0].address, wallets[1].address, scalingFactor.mul(new BN(10000)).toString(10))
        );
        await transactions.getTransactionReceipt(
            await erc20.mint(wallets[0].address, wallets[0].address, scalingFactor.mul(new BN(10000)).toString(10))
        );
    });

    it('ERC20Bridge.sol is deployed to network', async () => {
        const address = await aztecToken.getContractAddress();
        const aztecAddress = await aztec.getContractAddress();
        expect(address).to.be.a('string');
        expect(address.length).to.equal(42);

        const deployedBytecode = await web3.eth.getCode(address);
        expect(deployedBytecode)
            .to.equal(AZTECERC20Bridge.deployedBytecode.replace('__AZTEC________________________', aztecAddress.slice(2)));
        const publicKey = await Promise.all(Array.from({ length: 4 }, (v, i) => web3.eth.getStorageAt(address, i)));
        expect(t2[0]).to.equal(publicKey[0]);
        expect(t2[1]).to.equal(publicKey[1]);
        expect(t2[2]).to.equal(publicKey[2]);
        expect(t2[3]).to.equal(publicKey[3]);
    });


    it('can issue a confidentialTransfer transaction', async () => {
        const aztecTokenAddress = await aztecToken.getContractAddress();

        await transactions.getTransactionReceipt(
            await erc20.approve(wallets[0].address, aztecTokenAddress, scalingFactor.mul(new BN(10000)).toString(10))
        );
        const inputNotes = [
            noteController.createNote(wallets[0].address, 100),
            noteController.createNote(wallets[0].address, 73),
            noteController.createNote(wallets[0].address, 101),
            noteController.createNote(wallets[0].address, 26),
        ];
        const kPublic = GROUP_MODULUS.sub(new BN('300', 10));
        const { proofData, challenge } = proof.constructJoinSplit(inputNotes, 0, wallets[0].address, kPublic);

        const metadata = noteController.encodeMetadata(inputNotes);

        const transactionHash = await aztecToken.confidentialTransfer(
            wallets[0].address,
            proofData,
            0,
            challenge,
            [],
            [wallets[0].address, wallets[0].address, wallets[1].address, wallets[1].address],
            metadata
        );

        let transaction = db.transactions.get(transactionHash);
        expect(transaction.transactionHash).to.equal(transactionHash);
        expect(transaction.status).to.equal('SENT');

        expect(noteController.get(inputNotes[0].noteHash).status).to.equal('OFF_CHAIN');
        expect(noteController.get(inputNotes[1].noteHash).status).to.equal('OFF_CHAIN');
        expect(noteController.get(inputNotes[2].noteHash).status).to.equal('OFF_CHAIN');
        expect(noteController.get(inputNotes[3].noteHash).status).to.equal('OFF_CHAIN');

        await aztecToken.updateJoinSplitTransaction(transactionHash);

        expect(noteController.get(inputNotes[0].noteHash).status).to.equal('UNSPENT');
        expect(noteController.get(inputNotes[1].noteHash).status).to.equal('UNSPENT');
        expect(noteController.get(inputNotes[2].noteHash).status).to.equal('UNSPENT');
        expect(noteController.get(inputNotes[3].noteHash).status).to.equal('UNSPENT');

        transaction = db.transactions.get(transactionHash);
        expect(transaction.transactionHash).to.equal(transactionHash);
        expect(transaction.status).to.equal('MINED');

        const contract = aztecToken.contract(aztecTokenAddress);
        expect(await contract.methods.noteRegistry(inputNotes[0].noteHash).call()).to.equal(wallets[0].address);
        expect(await contract.methods.noteRegistry(inputNotes[1].noteHash).call()).to.equal(wallets[0].address);
        expect(await contract.methods.noteRegistry(inputNotes[2].noteHash).call()).to.equal(wallets[1].address);
        expect(await contract.methods.noteRegistry(inputNotes[3].noteHash).call()).to.equal(wallets[1].address);

        const {
            proofData: newProofData,
            challenge: newChallenge,
            inputSignatures,
            outputOwners,
            metadata: newMetadata,
            noteHashes,
        } = noteController.createConfidentialTransfer(
            [inputNotes[0].noteHash, inputNotes[1].noteHash],
            [[wallets[2].address, 20], [wallets[2].address, 3]],
            150,
            wallets[1].address,
            aztecTokenAddress
        );

        const redeemTransactionHash = await aztecToken.confidentialTransfer(
            wallets[1].address,
            newProofData,
            2,
            newChallenge,
            inputSignatures,
            outputOwners,
            newMetadata,
            aztecTokenAddress
        );

        await aztecToken.updateJoinSplitTransaction(redeemTransactionHash);
        expect(noteController.get(noteHashes[0]).status).to.equal('SPENT');
        expect(noteController.get(noteHashes[1]).status).to.equal('SPENT');
        expect(noteController.get(noteHashes[2]).status).to.equal('UNSPENT');
        expect(noteController.get(noteHashes[3]).status).to.equal('UNSPENT');
    });
});
