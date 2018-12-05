const chai = require('chai');
const crypto = require('crypto');
const BN = require('bn.js');

const db = require('../../db/db');
const basicWallet = require('../../basicWallet/basicWallet');
const aztec = require('./aztec');
const aztecProof = require('../../../proof/proof');
const { t2, GROUP_MODULUS } = require('../../../params');
const noteController = require('../../note/controller');
const web3 = require('../../web3Listener');

const { expect } = chai;

describe('aztec tests', () => {
    let wallet;
    let wallets = [];
    beforeEach(async () => {
        db.clear();
        const privateKey = `0x${crypto.randomBytes(32, 16).toString('hex')}`;
        wallet = await basicWallet.createFromPrivateKey(privateKey, 'test');
        wallets = [
            await basicWallet.createFromPrivateKey(privateKey, 'testB'),
            await basicWallet.createFromPrivateKey(privateKey, 'testC'),
        ];

        const accounts = await web3.eth.getAccounts();
        await web3.eth.sendTransaction({
            from: accounts[0],
            to: wallet.address,
            value: web3.utils.toWei('0.5', 'ether'),
        });
    });

    it('can create transaction', async () => {
        const transactionHash = await aztec.deployAztec(wallet.address);
        await aztec.updateAztec(transactionHash);
        expect(typeof (transactionHash)).to.equal('string');
        expect(transactionHash.length).to.equal(66);
        expect(db.transactions.get(transactionHash).status).to.equal('MINED');
        expect(db.contracts.aztec.get().latest.transactionHash).to.equal(transactionHash);
    });

    it('can create join split transaction', async () => {
        const deployTransactionHash = await aztec.deployAztec(wallet.address);
        await aztec.updateAztec(deployTransactionHash);
        const inputNotes = [
            noteController.createNote(wallets[0].address, 100),
            noteController.createNote(wallets[0].address, 73),
            noteController.createNote(wallets[1].address, 101),
            noteController.createNote(wallets[1].address, 26),
        ];
        const kPublic = GROUP_MODULUS.sub(new BN(300, 10));
        const { proofData, challenge } = aztecProof.constructJoinSplit(inputNotes, 0, wallet.address, kPublic);
        const transactionHash = await aztec.joinSplit(
            wallet.address,
            proofData,
            0,
            challenge,
            t2
        );
        expect(typeof (transactionHash)).to.equal('string');
        expect(transactionHash.length).to.equal(66);
    }).timeout(5000);
});
