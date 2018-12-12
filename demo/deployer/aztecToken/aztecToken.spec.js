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
const { GROUP_MODULUS } = require('../../../aztec-crypto-js/params');

const { expect } = chai;
const web3 = require('../../web3Listener');

describe('aztecToken tests', function describe() {
    this.timeout(10000);
    const wallets = [];
    let scalingFactor;
    let aztecAddress;
    let erc20Address;
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
        scalingFactor = 10000;
        await erc20.updateErc20(await erc20.deployErc20(wallets[0].address));
        await transactions.getTransactionReceipt(await erc20.mint(wallets[0].address, wallets[1].address, scalingFactor * 10000));
        await transactions.getTransactionReceipt(await erc20.mint(wallets[0].address, wallets[0].address, scalingFactor * 10000));

        await aztec.updateAztec(await aztec.deployAztec(wallets[0].address));
        aztecAddress = db.contracts.aztec.get().latest.contractAddress;
        erc20Address = db.contracts.erc20.get().latest.contractAddress;
    });

    it('can create aztecToken contract', async () => {
        const transactionHash = await aztecToken.deployAztecToken(wallets[0].address, aztecAddress, erc20Address, scalingFactor);

        let transaction = db.transactions.get(transactionHash);
        expect(transaction.transactionHash).to.equal(transactionHash);
        expect(transaction.status).to.equal('SENT');

        await aztecToken.updateAztecToken(transactionHash);

        transaction = db.transactions.get(transactionHash);
        expect(transaction.transactionHash).to.equal(transactionHash);
        expect(transaction.status).to.equal('MINED');
    });


    it('can issue a confidentialTransfer transaction', async () => {
        await aztecToken.updateAztecToken(
            await aztecToken.deployAztecToken(wallets[0].address, aztecAddress, erc20Address, scalingFactor)
        );
        const aztecTokenContract = db.contracts.aztecToken.get().latest;
        const aztecTokenAddress = aztecTokenContract.contractAddress;

        await transactions.getTransactionReceipt(
            await erc20.approve(wallets[0].address, aztecTokenAddress, scalingFactor * 10000)
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
            wallets[1].address
        );

        const redeemTransactionHash = await aztecToken.confidentialTransfer(
            wallets[1].address,
            newProofData,
            2,
            newChallenge,
            inputSignatures,
            outputOwners,
            newMetadata
        );

        await aztecToken.updateJoinSplitTransaction(redeemTransactionHash);
        expect(noteController.get(noteHashes[0]).status).to.equal('SPENT');
        expect(noteController.get(noteHashes[1]).status).to.equal('SPENT');
        expect(noteController.get(noteHashes[2]).status).to.equal('UNSPENT');
        expect(noteController.get(noteHashes[3]).status).to.equal('UNSPENT');
    });
});
