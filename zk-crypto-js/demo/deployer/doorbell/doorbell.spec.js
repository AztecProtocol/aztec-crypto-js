/* eslint-disable prefer-arrow-callback */

const chai = require('chai');
const crypto = require('crypto');

const db = require('../../db/db');
const basicWallet = require('../../basicWallet/basicWallet');
const doorbell = require('./doorbell');

const { expect } = chai;
const web3 = require('../../web3Listener');

describe('doorbell tests', function describe() {
    this.timeout(10000);
    const wallets = [];
    beforeEach(async () => {
        db.clear();
        wallets[0] = await basicWallet.createFromPrivateKey(`0x${crypto.randomBytes(32).toString('hex')}`, 'testA');
        wallets[1] = await basicWallet.createFromPrivateKey(`0x${crypto.randomBytes(32).toString('hex')}`, 'testB');

        const accounts = await web3.eth.getAccounts();
        await Promise.all(wallets.map((wallet) => {
            return web3.eth.sendTransaction({
                from: accounts[0],
                to: wallet.address,
                value: web3.utils.toWei('0.5', 'ether'),
            });
        }));
    });

    it('can create doorbell', async () => {
        const transactionHash = await doorbell.deployDoorbell(wallets[0].address);

        const result = await doorbell.updatedoorbell(transactionHash);
        const { transactionReceipt } = result.latest;
        expect(typeof (transactionHash)).to.equal('string');
        expect(transactionHash).to.equal(transactionReceipt.transactionHash);
        expect(db.transactions.get(transactionHash).status).to.equal('MINED');
        expect(db.contracts.doorbell.get().latest.transactionHash).to.equal(transactionHash);
    });
});
