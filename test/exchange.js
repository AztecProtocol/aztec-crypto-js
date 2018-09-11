/* global artifacts, assert, contract, beforeEach, it:true */
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:9545'));

const Exchange = artifacts.require('./contracts/exchange/Exchange');
const UsefulCoin = artifacts.require('./contracts/tokens/UsefulCoin');
const SecurityTest = artifacts.require('./contracts/Security/SecurityTest');
const ecdsaApi = require('../helpers/ecdsaApi');
const exceptions = require('./exceptions');
const coordsContract = artifacts.require('./FOO.sol');

// https://ethereum.stackexchange.com/questions/8650/is-there-a-maximum-number-of-entries-for-a-mapping
contract.only('Token', (accounts) => {
    let arethaFrankloans;
    let andollarsPaak;
    let witherBills;
    let smoniy;
    let dexchange;
    let securityTest;
    let coordsCon;

    beforeEach(async () => {
        arethaFrankloans = await UsefulCoin.new({ from: accounts[0], value: web3.toWei("1", "ether")});
        andollarsPaak = await UsefulCoin.new({ from: accounts[1], value: web3.toWei("2", "ether")});
        witherBills = await UsefulCoin.new({ from: accounts[2], value: web3.toWei("3", "ether")});
        smoniy = await UsefulCoin.new({ from: accounts[3], value: web3.toWei("4", "ether")});
        securityTest = await SecurityTest.new({
            from: accounts[0],
        });
        dexchange = await Exchange.new();
        coordsCon = await coordsContract.new();
    });
    
    it('initial balances are correct', async () => {
        const balance0 = await arethaFrankloans.balanceOf(accounts[0]);
        const balance1 = await andollarsPaak.balanceOf(accounts[1]);
        const balance2 = await witherBills.balanceOf(accounts[2]);
        const balance3 = await smoniy.balanceOf(accounts[3]);
        assert.equal(balance0.toString(10) , web3.toWei("1000000", "ether"));
        assert.equal(balance1.toString(10) , web3.toWei("2000000", "ether"));
        assert.equal(balance2.toString(10) , web3.toWei("3000000", "ether"));
        assert.equal(balance3.toString(10) , web3.toWei("4000000", "ether"));
    });

    it.only('succesfully executes exchange of assets - non partial order', async () => {
        const maker = accounts[0];
        const taker = accounts[1];
        const makerValue = web3.toWei("700000", "ether");
        const takerValue = web3.toWei("1500000", "ether");
        const makerSignature = ecdsaApi.signMessageComplex({
            callingAddress: dexchange.address,
            value: makerValue,
            nonce: 0,
            sender: accounts[0],
        });
        const takerSignature = ecdsaApi.signMessageComplex({
            callingAddress: dexchange.address,
            value: takerValue,
            nonce: 0,
            sender: accounts[1],
        });
        const orderHash = ecdsaApi.encodeAndHash(makerSignature, takerSignature);

        const orderAddresses = [maker, taker, arethaFrankloans.address, andollarsPaak.address];
        const orderValues = [makerValue, takerValue, takerValue];
        await dexchange.assembleOrder(
            orderAddresses,
            orderValues,
            makerSignature.r, makerSignature.s, makerSignature.v,
            takerSignature.r, takerSignature.s, takerSignature.v,
            false,
            orderHash,
        );
        
        await dexchange.fillOrdersTemp();
        
        const balance0 = await arethaFrankloans.balanceOf(accounts[0]);
        const balance1 = await arethaFrankloans.balanceOf(accounts[1]);
        const balance2 = await andollarsPaak.balanceOf(accounts[0]);
        const balance3 = await andollarsPaak.balanceOf(accounts[1]);
        assert.equal(balance0.toString(10), web3.toWei("300000", "ether"));
        assert.equal(balance1.toString(10), web3.toWei("700000", "ether"));
        assert.equal(balance2.toString(10), web3.toWei("1500000", "ether"));
        assert.equal(balance3.toString(10), web3.toWei("500000", "ether"));

        // const orders = [order0];
        // await dexchange.fillOrders(orders);
        assert.isTrue(false);
    });

    it('unauthorised order causes revert', async () => {
    
    });
});