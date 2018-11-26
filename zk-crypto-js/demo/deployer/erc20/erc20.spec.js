const chai = require('chai');
const crypto = require('crypto');
const Web3 = require('web3');

const db = require('../../db/db');
const basicWallet = require('../../basicWallet/basicWallet');
const erc20 = require('./erc20');
const transactions = require('../transactions/transactions');

const { expect } = chai;

const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:9545'));

describe('erc20 tests', () => {
    const wallets = [];
    beforeEach(async () => {
        db.clear();
        wallets[0] = basicWallet.createFromPrivateKey(`0x${crypto.randomBytes(32, 16).toString('hex')}`, 'testA');
        wallets[1] = basicWallet.createFromPrivateKey(`0x${crypto.randomBytes(32, 16).toString('hex')}`, 'testB');

        const accounts = await web3.eth.getAccounts();
        await Promise.all(wallets.map((wallet) => {
            return web3.eth.sendTransaction({
                from: accounts[0],
                to: wallet.address,
                value: web3.utils.toWei('0.5', 'ether'),
            });
        }));
    });

    it('can create erc20', async () => {
        const transactionHash = await erc20.deployErc20(wallets[0].address);

        const result = await erc20.updateErc20(transactionHash);
        const { transactionReceipt } = result.latest;
        expect(typeof (transactionHash)).to.equal('string');
        expect(transactionHash).to.equal(transactionReceipt.transactionHash);
        expect(db.transactions.get(transactionHash).status).to.equal('MINED');
        expect(db.contracts.erc20.get().latest.transactionHash).to.equal(transactionHash);
    });

    it('can issue erc20 mint transaction', async () => {
        const deployTxHash = await erc20.deployErc20(wallets[0].address);
        await erc20.updateErc20(deployTxHash);
        const mintTxHash = await erc20.mint(wallets[0].address, wallets[1].address, 1000);
        await transactions.getTransactionReceipt(mintTxHash);

        const { contractAddress } = db.contracts.erc20.get().latest;
        const contract = erc20.contract(contractAddress);
        const balance = await contract.methods.balanceOf(wallets[1].address).call();
        expect(balance.toString(10)).to.equal('1000');
    });

    it('can issue erc20 approval transaction', async () => {
        const deployTxHash = await erc20.deployErc20(wallets[0].address);
        await erc20.updateErc20(deployTxHash);
        const mintTxHash = await erc20.mint(wallets[0].address, wallets[1].address, 1000);
        await transactions.getTransactionReceipt(mintTxHash);
        const approveTxHash = await erc20.approve(wallets[1].address, wallets[0].address, 1000);
        await transactions.getTransactionReceipt(approveTxHash);

        const { contractAddress } = db.contracts.erc20.get().latest;
        const contract = erc20.contract(contractAddress);
        const allowance = await contract.methods.allowance(wallets[1].address, wallets[0].address).call();
        expect(allowance.toString(10)).to.equal('1000');
    });
});
