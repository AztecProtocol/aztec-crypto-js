/* eslint-disable prefer-arrow-callback */

const chai = require('chai');
const crypto = require('crypto');

const db = require('../../db/db');
const basicWallet = require('../../basicWallet/basicWallet');
const erc20 = require('./erc20');
const transactions = require('../transactions/transactions');
const web3 = require('../../web3Listener');
const ERC20Mintable = require('../../../build/contracts/ERC20Mintable');

const { expect } = chai;

describe.only('erc20 tests', function describe() {
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

    it('ERC20Mintable.sol is deployed to network', async () => {
        const address = await erc20.getContractAddress();
        expect(address).to.be.a('string');
        expect(address.length).to.equal(42);

        const deployedBytecode = await web3.eth.getCode(address);
        expect(deployedBytecode)
            .to.equal(ERC20Mintable.deployedBytecode);
    });

    it('can issue erc20 mint transaction', async () => {
        const mintTxHash = await erc20.mint(wallets[0].address, wallets[1].address, 1000);
        await transactions.getTransactionReceipt(mintTxHash);

        const contractAddress = await erc20.getContractAddress();
        const contract = erc20.contract(contractAddress);
        const balance = await contract.methods.balanceOf(wallets[1].address).call();
        expect(balance.toString(10)).to.equal('1000');
    });

    it('can issue erc20 approval transaction', async () => {
        const mintTxHash = await erc20.mint(wallets[0].address, wallets[1].address, 1000);
        await transactions.getTransactionReceipt(mintTxHash);
        const approveTxHash = await erc20.approve(wallets[1].address, wallets[0].address, 1000);
        await transactions.getTransactionReceipt(approveTxHash);

        const contractAddress = await erc20.getContractAddress();
        const contract = erc20.contract(contractAddress);
        const allowance = await contract.methods.allowance(wallets[1].address, wallets[0].address).call();
        expect(allowance.toString(10)).to.equal('1000');
    });
});
