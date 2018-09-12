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
        andollarsPaak = await UsefulCoin.new({ from: accounts[1], value: web3.toWei("2", "ether")});
        witherBills = await UsefulCoin.new({ from: accounts[2], value: web3.toWei("3", "ether")});
        smoniy = await UsefulCoin.new({ from: accounts[3], value: web3.toWei("4", "ether")});
        dexchange = await Exchange.new();
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

        const orderHash = ecdsaApi.encodeAndHash(maker, makerToken, takerToken, makerValue, takerValue);
        const orderAddresses = [maker, taker, makerToken, takerToken];
        const orderValues = [makerValue, takerValue, takerValue];
        await dexchange.assembleOrder(
            orderAddresses, orderValues,
            makerSignature.r, makerSignature.s, makerSignature.v,
            takerSignature.r, takerSignature.s, takerSignature.v,
            false, orderHash,
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
    });

    it('unauthorised order causes revert', async () => {
        const maker = accounts[0];
        const taker = accounts[1];
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
        const orderHash = ecdsaApi.encodeAndHash(makerSignature, takerSignature);
        const orderAddresses = [maker, taker, arethaFrankloans.address, andollarsPaak.address];
        const orderValues = [makerValue, takerValue, takerValue];
        await dexchange.assembleOrder(
            orderAddresses, orderValues,
            makerSignature.r, makerSignature.s, makerSignature.v,
            takerSignature.r, takerSignature.s, takerSignature.v,
            false, orderHash,
        );
        
        await exceptions.catchRevert(dexchange.fillOrdersTemp());
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
    //     const orderHash = ecdsaApi.encodeAndHash(makerSignature, takerSignature);
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
    //     let allFillingPartial = [];
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
    //         allFillingPartial[i] = false;
    //         allOrderHashes[i] = orderHash;
    //     }

    //     await dexchange.fillOrders(
    //         allOrderAddresses, allOrderValues, 
    //         allMakerSignatureR, allMakerSignatureS, allMakerSignatureV, 
    //         allTakerSignatureR, allTakerSignatureS, allTakerSignatureV,
    //         allFillingPartial, allOrderHashes
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