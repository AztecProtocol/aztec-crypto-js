const chai = require('chai');
const crypto = require('crypto');
const BN = require('bn.js');

const db = require('../../db/db');
const basicWallet = require('../../basicWallet/basicWallet');
const aztec = require('./aztec');
const aztecProof = require('../../../aztec-crypto-js/proof/proof');
const { t2, GROUP_MODULUS } = require('../../../aztec-crypto-js/params');
const noteController = require('../../note/controller');
const web3 = require('../../web3Listener');

const AZTEC = require('../../../build/contracts/AZTEC');

const { expect } = chai;

describe('aztec tests', () => {
    let wallet;
    let wallets = [];
    beforeEach(async () => {
        db.clear();
        const privateKey = `0x${crypto.randomBytes(32).toString('hex')}`;
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

    it('AZTEC.sol is deployed to network', async () => {
        const address = await aztec.getContractAddress();
        expect(address).to.be.a('string');
        expect(address.length).to.equal(42);

        const deployedBytecode = await web3.eth.getCode(address);
        expect(deployedBytecode).to.equal(AZTEC.deployedBytecode);
    });

    it('can create join split transaction', async () => {
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
    }).timeout(10000);
});
