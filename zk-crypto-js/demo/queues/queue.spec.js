const chai = require('chai');
const crypto = require('crypto');
const Web3 = require('web3');

const queues = require('./queues');

const db = require('../db/db');
const basicWallet = require('../basicWallet/basicWallet');
const erc20 = require('../deployer/erc20/erc20');

const { expect } = chai;

const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:9545'));

function queueHandler(q) {
    return new Promise((resolve, reject) => {
        q.on('error', (e) => { reject(new Error(e)); });
        q.on('completed', (e) => { resolve(e); });
    });
}

describe('queue tests', () => {
    describe('queue erc20 test', () => {
        let wallets = [];
        beforeEach(async () => {
            db.clear();
            const privateKey = `0x${crypto.randomBytes(32, 16).toString('hex')}`;
            wallets = [
                basicWallet.createFromPrivateKey(privateKey, 'testA'),
                basicWallet.createFromPrivateKey(privateKey, 'testB'),
                basicWallet.createFromPrivateKey(privateKey, 'testC'),
            ];

            const accounts = await web3.eth.getAccounts();
            await Promise.all(wallets.map(wallet => web3.eth.sendTransaction({
                from: accounts[0],
                to: wallet.address,
                value: web3.utils.toWei('1', 'ether'),
            })));
        });

        it('will process erc20 deployment job', async () => {
            const deployPromise = queueHandler(queues.erc20.deploy.queue);
            const updatePromise = queueHandler(queues.erc20.update.queue);

            queues.erc20.deploy.queue.add({
                address: wallets[0].address,
            });
            const deployResult = await deployPromise;
            const transactionHash = deployResult.returnvalue;
            expect(typeof (transactionHash)).to.equal('string');
            expect(transactionHash.length).to.equal(66);
            expect(db.contracts.erc20.get().latest.transactionHash).to.equal(transactionHash);
            const updateResult = await updatePromise;
            expect(updateResult.returnvalue.latest.transactionHash).to.equal(transactionHash);
            expect(db.transactions.get(transactionHash).status).to.equal('MINED');
            expect(db.contracts.erc20.get().latest.transactionHash).to.equal(transactionHash);
            expect(db.contracts.erc20.get().latest.contractAddress)
                .to
                .equal(db.transactions.get(transactionHash).transactionReceipt.contractAddress);
        });

        it('will mint and approve erc20 tokens', async () => {
            const updatePromise = queueHandler(queues.erc20.update.queue);

            queues.erc20.deploy.queue.add({
                address: wallets[0].address,
            });

            const updateResult = await updatePromise;
            const { transactionHash } = updateResult.returnvalue.latest;
            expect(db.transactions.get(transactionHash).status).to.equal('MINED');

            const mintPromise = queueHandler(queues.erc20.mint.queue);
            const txPromise = queueHandler(queues.transactions.queue);

            queues.erc20.mint.queue.add({
                from: wallets[0].address,
                to: wallets[1].address,
                value: 100000,
            });
            const mintResult = await mintPromise;
            const mintTxHash = mintResult.returnvalue;
            expect(db.transactions.get(mintTxHash).status).to.equal('SENT');
            const minedResult = await txPromise;
            expect(db.transactions.get(mintTxHash).status).to.equal('MINED');
            const transactionReceipt = minedResult.returnvalue;
            expect(transactionReceipt.transactionHash).to.equal(mintTxHash);
            const contract = erc20.contract(db.contracts.erc20.get().latest.contractAddress);
            const balance = await contract.methods.balanceOf(wallets[1].address).call();
            expect(balance.toString(10)).to.equal('100000');
        });
    });

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
            const deployPromise = queueHandler(queues.aztec.deploy.queue);
            const updatePromise = queueHandler(queues.aztec.update.queue);

            queues.aztec.deploy.queue.add({
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
            expect(db.contracts.aztec.get().latest.contractAddress)
                .to
                .equal(db.transactions.get(transactionHash).transactionReceipt.contractAddress);
        }).timeout(5000);
    });
});
