/* global artifacts, assert, contract, beforeEach, it:true */
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:9545'));

const Exchange = artifacts.require('./contracts/exchange/Exchange');
const UsefulCoin = artifacts.require('./contracts/tokens/UsefulCoin');
const ecdsaApi = require('../helpers/ecdsaApi');
const exceptions = require('./exceptions');

contract.only('Token', (accounts) => {
    let arethaFrankloans;
    let andollarsPaak;
    let witherBills;
    let smoniy;
    let dexchange;

    beforeEach(async () => {
        arethaFrankloans = await UsefulCoin.new({ from: accounts[0], value: web3.toWei("1", "ether")});
        andollarsPaak = await UsefulCoin.new({ from: accounts[1], value: web3.toWei("3", "ether")});
        andollarsPaak.transfer(accounts[2], web3.toWei("1000000", "ether"), { from: accounts[1]});
        witherBills = await UsefulCoin.new({ from: accounts[2], value: web3.toWei("3", "ether")});
        smoniy = await UsefulCoin.new({ from: accounts[3], value: web3.toWei("4", "ether")});
        dexchange = await Exchange.new();
    });
    
    it('initial balances are correct', async () => {
        const balance0 = await arethaFrankloans.balanceOf(accounts[0]);
        const balance1 = await andollarsPaak.balanceOf(accounts[1]);
        const balance2 = await witherBills.balanceOf(accounts[2]);
        const balance3 = await smoniy.balanceOf(accounts[3]);
        const balance4 = await andollarsPaak.balanceOf(accounts[2]);
        assert.equal(balance0.toString(10) , web3.toWei("1000000", "ether"));
        assert.equal(balance1.toString(10) , web3.toWei("2000000", "ether"));
        assert.equal(balance2.toString(10) , web3.toWei("3000000", "ether"));
        assert.equal(balance3.toString(10) , web3.toWei("4000000", "ether"));
        assert.equal(balance4.toString(10) , web3.toWei("1000000", "ether"));
    });

    it('succesfully executes a valid non-partial order', async () => {
        const maker = accounts[0];
        const taker = accounts[1];
        const makerToken = arethaFrankloans.address;
        const takerToken = andollarsPaak.address;
        const makerValue = web3.toWei("700000", "ether");
        const takerValue = web3.toWei("1500000", "ether");
        const makerSignature = ecdsaApi.signMessageComplex({
            callingAddress: dexchange.address,
            value: makerValue,
            nonce: 0,
            sender: maker,
        });
        const takerSignature = ecdsaApi.signMessageComplex({
            callingAddress: dexchange.address,
            value: takerValue,
            nonce: 0,
            sender: taker,
        });

        const orderHash = ecdsaApi.encodeAndHashOrder(maker, makerToken, takerToken, makerValue, takerValue);
        const orderAddresses = [maker, taker, makerToken, takerToken];
        const orderValues = [makerValue, takerValue, takerValue];
        await dexchange.assembleOrder(
            orderAddresses, orderValues,
            makerSignature.r, makerSignature.s, makerSignature.v,
            takerSignature.r, takerSignature.s, takerSignature.v,
            false, orderHash,
        );
        await dexchange.fillOrdersTemp(0);
        
        const balance0 = await arethaFrankloans.balanceOf(accounts[0]);
        const balance1 = await arethaFrankloans.balanceOf(accounts[1]);
        const balance2 = await andollarsPaak.balanceOf(accounts[0]);
        const balance3 = await andollarsPaak.balanceOf(accounts[1]);
        assert.equal(balance0.toString(10), web3.toWei("300000", "ether"));
        assert.equal(balance1.toString(10), web3.toWei("700000", "ether"));
        assert.equal(balance2.toString(10), web3.toWei("1500000", "ether"));
        assert.equal(balance3.toString(10), web3.toWei("500000", "ether"));
    });

    it('succesfully executes a valid partial order, same taker', async () => {
        const maker = accounts[0];
        const taker = accounts[1];
        const makerToken = arethaFrankloans.address;
        const takerToken = andollarsPaak.address;
        const makerValue1 = web3.toWei("900000", "ether");
        const makerValue2 = web3.toWei("300000", "ether");
        const takerValue1 = web3.toWei("1500000", "ether");
        const takerValue2 = web3.toWei("1000000", "ether");
        const takerValue3 = web3.toWei("500000", "ether");
        const makerSignature = ecdsaApi.signMessageComplex({
            callingAddress: dexchange.address,
            value: makerValue1,
            nonce: 0,
            sender: maker,
        });
        const takerSignature = ecdsaApi.signMessageComplex({
            callingAddress: dexchange.address,
            value: takerValue2,
            nonce: 0,
            sender: taker,
        });

        const orderHash1 = ecdsaApi.encodeAndHashOrder(maker, makerToken, takerToken, makerValue1, takerValue1);
        const orderAddresses = [maker, taker, makerToken, takerToken];
        const orderValues1 = [makerValue1, takerValue1, takerValue2];
        await dexchange.assembleOrder(
            orderAddresses, orderValues1,
            makerSignature.r, makerSignature.s, makerSignature.v,
            takerSignature.r, takerSignature.s, takerSignature.v,
            false, orderHash1,
        );
        await dexchange.fillOrdersTemp(0);
        
        let balance0 = await arethaFrankloans.balanceOf(accounts[0]);
        let balance1 = await arethaFrankloans.balanceOf(accounts[1]);
        let balance2 = await andollarsPaak.balanceOf(accounts[0]);
        let balance3 = await andollarsPaak.balanceOf(accounts[1]);
        assert.equal(balance0.toString(10), web3.toWei("400000", "ether")); // 100,000 - 60,000
        assert.equal(balance1.toString(10), web3.toWei("600000", "ether")); // 0 + 60,000
        assert.equal(balance2.toString(10), web3.toWei("1000000", "ether")); // 0 + 1,000,000
        assert.equal(balance3.toString(10), web3.toWei("1000000", "ether")); // 2,000,000 - 1,000,000

        const orderHash2 = ecdsaApi.encodeAndHashOrder(maker, makerToken, takerToken, makerValue2, takerValue3);
        const orderValues2 = [makerValue2, takerValue3, takerValue3];
        await arethaFrankloans.approve(dexchange.address, makerValue2, { from: maker });
        await andollarsPaak.approve(dexchange.address, takerValue3, { from: taker });
        await dexchange.assembleOrder(
            orderAddresses, orderValues2,
            0, 0, 0,
            0, 0, 0,
            true, orderHash2,
        );
        await dexchange.fillOrdersTemp(1);
        
        balance0 = await arethaFrankloans.balanceOf(accounts[0]);
        balance1 = await arethaFrankloans.balanceOf(accounts[1]);
        balance2 = await andollarsPaak.balanceOf(accounts[0]);
        balance3 = await andollarsPaak.balanceOf(accounts[1]);
        assert.equal(balance0.toString(10), web3.toWei("100000", "ether")); // 40,000 - 30,000
        assert.equal(balance1.toString(10), web3.toWei("900000", "ether")); // 60,000 + 30,000
        assert.equal(balance2.toString(10), web3.toWei("1500000", "ether")); // 1,000,000 + 500,000
        assert.equal(balance3.toString(10), web3.toWei("500000", "ether")); // 1,000,000 - 500,000
    });
    
    it('succesfully executes a valid partial order, different takers', async () => {
        const maker = accounts[0];
        const taker1 = accounts[1];
        const taker2 = accounts[2];
        const makerToken = arethaFrankloans.address;
        const takerToken = andollarsPaak.address;
        const makerValue1 = web3.toWei("900000", "ether");
        const makerValue2 = web3.toWei("300000", "ether");
        const takerValue1 = web3.toWei("1500000", "ether");
        const takerValue2 = web3.toWei("1000000", "ether");
        const takerValue3 = web3.toWei("500000", "ether");
        const makerSignature = ecdsaApi.signMessageComplex({
            callingAddress: dexchange.address,
            value: makerValue1,
            nonce: 0,
            sender: maker,
        });
        const takerSignature = ecdsaApi.signMessageComplex({
            callingAddress: dexchange.address,
            value: takerValue2,
            nonce: 0,
            sender: taker1,
        });

        const orderHash1 = ecdsaApi.encodeAndHashOrder(maker, makerToken, takerToken, makerValue1, takerValue1);
        const orderAddresses = [maker, taker1, makerToken, takerToken];
        const orderValues1 = [makerValue1, takerValue1, takerValue2];
        await dexchange.assembleOrder(
            orderAddresses, orderValues1,
            makerSignature.r, makerSignature.s, makerSignature.v,
            takerSignature.r, takerSignature.s, takerSignature.v,
            false, orderHash1,
        );
        await dexchange.fillOrdersTemp(0);
        
        let balance0 = await arethaFrankloans.balanceOf(accounts[0]);
        let balance1 = await arethaFrankloans.balanceOf(accounts[1]);
        let balance2 = await andollarsPaak.balanceOf(accounts[0]);
        let balance3 = await andollarsPaak.balanceOf(accounts[1]);
        assert.equal(balance0.toString(10), web3.toWei("400000", "ether")); // 100,000 - 60,000
        assert.equal(balance1.toString(10), web3.toWei("600000", "ether")); // 0 + 60,000
        assert.equal(balance2.toString(10), web3.toWei("1000000", "ether")); // 0 + 1,000,000
        assert.equal(balance3.toString(10), web3.toWei("1000000", "ether")); // 2,000,000 - 1,000,000

        const orderHash2 = ecdsaApi.encodeAndHashOrder(maker, makerToken, takerToken, makerValue2, takerValue3);
        const orderAddresses2 = [maker, taker2, makerToken, takerToken];
        const orderValues2 = [makerValue2, takerValue3, takerValue3];
        await arethaFrankloans.approve(dexchange.address, makerValue2, { from: maker });
        await andollarsPaak.approve(dexchange.address, takerValue3, { from: taker2 });
        await dexchange.assembleOrder(
            orderAddresses2, orderValues2,
            0, 0, 0,
            0, 0, 0,
            true, orderHash2,
        );
        await dexchange.fillOrdersTemp(1);
        
        balance0 = await arethaFrankloans.balanceOf(accounts[0]);
        balance1 = await arethaFrankloans.balanceOf(accounts[1]);
        balance2 = await andollarsPaak.balanceOf(accounts[0]);
        balance3 = await andollarsPaak.balanceOf(accounts[1]);
        const balance4 = await arethaFrankloans.balanceOf(accounts[2]);
        const balance5 = await andollarsPaak.balanceOf(accounts[2]);
        assert.equal(balance0.toString(10), web3.toWei("100000", "ether")); // 40,000 - 30,000
        assert.equal(balance1.toString(10), web3.toWei("600000", "ether")); // 60,000 + 0
        assert.equal(balance2.toString(10), web3.toWei("1500000", "ether")); // 1,000,000 + 500,000
        assert.equal(balance3.toString(10), web3.toWei("1000000", "ether")); // 1,000,000 - 0
        assert.equal(balance4.toString(10), web3.toWei("300000", "ether")); // 0 + 30,000
        assert.equal(balance5.toString(10), web3.toWei("500000", "ether")); // 1,000,000 - 500,000
    });

    // it.only('succesfully executes a non-partial order cancellation', async () => {
    // });
    // it.only('succesfully executes a partial order cancellation', async () => {
    // });
    
    it('unauthorised order causes revert', async () => {
        const maker = accounts[0];
        const taker = accounts[1];
        const makerToken = arethaFrankloans.address;
        const takerToken = andollarsPaak.address;
        const makerValue = web3.toWei("700000", "ether");
        const takerValue = web3.toWei("1500000", "ether");
        const makerSignature = ecdsaApi.signMessageComplex({
            callingAddress: 0xdeadbeefdeadbeef,
            value: makerValue,
            nonce: 0,
            sender: maker,
        });
        const takerSignature = ecdsaApi.signMessageComplex({
            callingAddress: dexchange.address,
            value: takerValue,
            nonce: 0,
            sender: taker,
        });
        const orderHash = ecdsaApi.encodeAndHashOrder(maker, makerToken, takerToken, makerValue, takerValue);
        const orderAddresses = [maker, taker, makerToken, takerToken];
        const orderValues = [makerValue, takerValue, takerValue];
        await dexchange.assembleOrder(
            orderAddresses, orderValues,
            makerSignature.r, makerSignature.s, makerSignature.v,
            takerSignature.r, takerSignature.s, takerSignature.v,
            false, orderHash,
        );
        
        await exceptions.catchRevert(dexchange.fillOrdersTemp(0));
    });

    // it.only('USING PROPER FILL ORDER succesfully executes exchange of assets - non partial order', async () => {
    //     const maker = accounts[0];
    //     const taker = accounts[1];
    //     const makerValue = web3.toWei("700000", "ether");
    //     const takerValue = web3.toWei("1500000", "ether");
    //     const makerSignature = ecdsaApi.signMessageComplex({
    //         callingAddress: dexchange.address,
    //         value: makerValue,
    //         nonce: 0,
    //         sender: accounts[0],
    //     });
    //     const takerSignature = ecdsaApi.signMessageComplex({
    //         callingAddress: dexchange.address,
    //         value: takerValue,
    //         nonce: 0,
    //         sender: accounts[1],
    //     });
    //     const orderHash = ecdsaApi.encodeAndHashOrder(makerSignature, takerSignature);
    //     const orderAddresses = [maker, taker, arethaFrankloans.address, andollarsPaak.address];
    //     const orderValues = [makerValue, takerValue, takerValue];
    //     await dexchange.assembleOrder(
    //         orderAddresses, orderValues,
    //         makerSignature.r, makerSignature.s, makerSignature.v,
    //         takerSignature.r, takerSignature.s, takerSignature.v,
    //         false, orderHash,
    //     );

    //     const numOrders = 2;
    //     let allOrderAddresses = [];
    //     let allOrderValues = [];
    //     let allMakerSignatureR = []; 
    //     let allMakerSignatureS = []; 
    //     let allMakerSignatureV = []; 
    //     let allTakerSignatureR = []; 
    //     let allTakerSignatureS = []; 
    //     let allTakerSignatureV = [];
    //     let allfillingExistingPartial = [];
    //     let allOrderHashes = [];
    //     for (let i = 0; i < numOrders; i++) {
    //         allOrderAddresses[i] = orderAddresses;
    //         allOrderValues[i] = orderValues;
    //         allMakerSignatureR[i] = makerSignature.r;
    //         allMakerSignatureS[i] = makerSignature.s;
    //         allMakerSignatureV[i] = makerSignature.v;
    //         allTakerSignatureR[i] = takerSignature.r;
    //         allTakerSignatureS[i] = takerSignature.s;
    //         allTakerSignatureV[i] = takerSignature.v;
    //         allfillingExistingPartial[i] = false;
    //         allOrderHashes[i] = orderHash;
    //     }

    //     await dexchange.fillOrders(
    //         allOrderAddresses, allOrderValues, 
    //         allMakerSignatureR, allMakerSignatureS, allMakerSignatureV, 
    //         allTakerSignatureR, allTakerSignatureS, allTakerSignatureV,
    //         allfillingExistingPartial, allOrderHashes
    //     );
        
    //     const balance0 = await arethaFrankloans.balanceOf(accounts[0]);
    //     const balance1 = await arethaFrankloans.balanceOf(accounts[1]);
    //     const balance2 = await andollarsPaak.balanceOf(accounts[0]);
    //     const balance3 = await andollarsPaak.balanceOf(accounts[1]);
    //     assert.equal(balance0.toString(10), web3.toWei("300000", "ether"));
    //     assert.equal(balance1.toString(10), web3.toWei("700000", "ether"));
    //     assert.equal(balance2.toString(10), web3.toWei("1500000", "ether"));
    //     assert.equal(balance3.toString(10), web3.toWei("500000", "ether"));
    // });
});