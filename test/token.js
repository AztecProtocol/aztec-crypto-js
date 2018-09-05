/* global artifacts, assert, contract, beforeEach, it:true */
const UsefulCoin = artifacts.require('./contracts/tokens/UsefulCoin');
const SecurityTest = artifacts.require('./contracts/Security/SecurityTest');
const ecdsaApi = require('../helpers/ecdsaApi');
const exceptions = require('./exceptions');

const ethToCoin = 1000000;

contract.only('Token', (accounts) => {
    let usefulCoin;
    let securityTest;
    beforeEach(async () => {
        usefulCoin = await UsefulCoin.new(accounts[0]);
        securityTest = await SecurityTest.new({
            from: accounts[0],
        });
        await usefulCoin.send(
            web3.toWei("1", "ether"),
            { from: accounts[0], },
        );
    });
    
    it('initial balance is correct', async () => {
        const balance = await usefulCoin.balanceOf(accounts[0]);
        assert.equal(balance.toString(10) , web3.toWei("1000000", "ether"));
    });

    it('transfered tokens correctly', async () => {
        const value = web3.toWei(0.6*ethToCoin, "ether");
        const balanceBefore = await usefulCoin.balanceOf(accounts[0]);
        assert.equal(balanceBefore.toString(10), web3.toWei("1000000", "ether"));
        await usefulCoin.transfer(accounts[1], value, { from: accounts[0] });
        const balanceAfter0 = await usefulCoin.balanceOf(accounts[0]);
        const balanceAfter1 = await usefulCoin.balanceOf(accounts[1]);
        assert.equal(balanceAfter0.toString(10), web3.toWei("400000", "ether"));
        assert.equal(balanceAfter1.toString(10), value);
    });

    it('delegateTransfer succesfully validates ecdsa signature and transfers tokens', async () => {
        const value = web3.toWei(0.6*ethToCoin, "ether");
        const signature = ecdsaApi.signMessageComplex({
            callingAddress: accounts[1],
            value,
            nonce: 0,
            sender: accounts[0],
        });
        const balanceBefore = await usefulCoin.balanceOf(accounts[0]);
        assert.equal(balanceBefore.toString(10), web3.toWei("1000000", "ether"));
        
        // we call this function using address[1], but signed by address[0]        
        usefulCoin.delegatedTransfer(accounts[0], accounts[2], value, value, signature.r, signature.s, signature.v, { from: accounts[1] });
        
        const balanceAfter0 = await usefulCoin.balanceOf(accounts[0]);
        const balanceAfter1 = await usefulCoin.balanceOf(accounts[1]);
        const balanceAfter2 = await usefulCoin.balanceOf(accounts[2]);
        assert.equal(balanceAfter0.toString(10), web3.toWei("400000", "ether"));
        assert.equal(balanceAfter1.toString(10), web3.toWei("0", "ether"));
        assert.equal(balanceAfter2.toString(10), web3.toWei("600000", "ether"));
    });

    it('signature is succesfully invalidated', async () => {
        const value = web3.toWei(0.6*ethToCoin, "ether");
        const signature = ecdsaApi.signMessageComplex({
            callingAddress: accounts[1],
            value,
            nonce: 0,
            sender: accounts[0],
        });
        const balanceBefore = await usefulCoin.balanceOf(accounts[0]);
        assert.equal(balanceBefore.toString(10), web3.toWei("1000000", "ether"));

        await usefulCoin.invalidateSignature(accounts[1], value, signature.r, signature.s, signature.v, { from: accounts[0] });
        await exceptions.catchRevert((usefulCoin.delegatedTransfer(
            accounts[0], accounts[2],
            value, value,
            signature.r, signature.s, signature.v,
            { from: accounts[1] },
        )));

        const balanceAfter = await usefulCoin.balanceOf(accounts[0]);
        assert.equal(balanceAfter.toString(10), web3.toWei("1000000", "ether"));
    });
});