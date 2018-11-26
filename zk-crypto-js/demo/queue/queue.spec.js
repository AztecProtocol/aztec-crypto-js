const chai = require('chai');
const crypto = require('crypto');
const Web3 = require('web3');

const queues = require('./queue');

const db = require('../db/db');
const basicWallet = require('../basicWallet/basicWallet');

const { expect } = chai;

const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:9545'));

function queueHandler(q) {
    return new Promise((resolve, reject) => {
        q.on('error', (e) => { reject(new Error(e)); });
        q.on('completed', (e) => { resolve(e); });
    });
}

describe('queue aztecDeploy test', () => {
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

    it('will process aztec deployment job', async () => {
        const deployPromise = queueHandler(queues.deployAztec.queue);
        const updatePromise = queueHandler(queues.updateAztec.queue);

        queues.deployAztec.queue.add({
            address: wallet.address,
        });
        const deployResult = await deployPromise;
        const transactionHash = deployResult.returnvalue;
        expect(typeof (transactionHash)).to.equal('string');
        expect(transactionHash.length).to.equal(66);
        expect(db.transactions.get(transactionHash).status).to.equal('SENT');
        expect(db.contracts.aztec.get().latest.transactionHash).to.equal(transactionHash);
        const updateResult = await updatePromise;
        expect(updateResult.returnvalue.latest.transactionHash).to.equal(transactionHash);
        expect(db.transactions.get(transactionHash).status).to.equal('MINED');
        expect(db.contracts.aztec.get().latest.transactionHash).to.equal(transactionHash);
        expect(db.contracts.aztec.get().latest.contractAddress).to.equal(db.transactions.get(transactionHash).transactionReceipt.contractAddress);
    });
});
