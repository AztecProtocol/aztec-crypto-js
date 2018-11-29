const chai = require('chai');
const crypto = require('crypto');
const Web3 = require('web3');

const db = require('../../db/db');
const basicWallet = require('../../basicWallet/basicWallet');
const aztec = require('./aztec');
const aztecProof = require('../../../proof/proof');
const { t2Formatted } = require('../../../params');

const { expect } = chai;

const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545'));

describe('aztec tests', () => {
    let wallet;
    beforeEach(async () => {
        db.clear();
        const privateKey = `0x${crypto.randomBytes(32, 16).toString('hex')}`;
        wallet = basicWallet.createFromPrivateKey(privateKey, 'test');

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
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({ kIn: [11, 22], kOut: [5, 28] });
        const { proofData, challenge } = aztecProof.constructJoinSplit(commitments, m, wallet.address, 0);
        const transactionHash = await aztec.joinSplit(
            wallet.address,
            proofData,
            m,
            challenge,
            t2Formatted
        );
        expect(typeof (transactionHash)).to.equal('string');
        expect(transactionHash.length).to.equal(66);
    }).timeout(5000);
});
