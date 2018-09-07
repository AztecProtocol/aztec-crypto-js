/* global artifacts, assert, contract, beforeEach, it:true */
const Exchange = artifacts.require('./contracts/exchange/Exchange');
const UsefulCoin = artifacts.require('./contracts/tokens/UsefulCoin');
const SecurityTest = artifacts.require('./contracts/Security/SecurityTest');
const ecdsaApi = require('../helpers/ecdsaApi');
const exceptions = require('./exceptions');
const coordsContract = artifacts.require('./FOO.sol');


contract.only('Token', (accounts) => {
    let arethaFrankloans;
    let andollarsPaak;
    let witherBills;
    let smoniy;
    let dexchange;
    let securityTest;
    let coordsCon;

    beforeEach(async () => {
        arethaFrankloans = await UsefulCoin.new();
        andollarsPaak = await UsefulCoin.new();
        witherBills = await UsefulCoin.new();
        smoniy = await UsefulCoin.new();
        securityTest = await SecurityTest.new({
            from: accounts[0],
        });
        dexchange = await Exchange.new();

        // for some reason when i have different accounts in {from: }, they still only go to account[0]
        await arethaFrankloans.send(web3.toWei("1", "ether"), { from: accounts[0] });
        await andollarsPaak.send(web3.toWei("2", "ether"), { from: accounts[0] });
        await witherBills.send(web3.toWei("3", "ether"), { from: accounts[0] });
        await smoniy.send(web3.toWei("4", "ether"), { from: accounts[0] });

        coordsCon = await coordsContract.new();
    });
    
    it('initial balances are correct', async () => {
        const balance0 = await arethaFrankloans.balanceOf(accounts[0]);
        const balance4 = await arethaFrankloans.balanceOf(accounts[1]);
        const balance1 = await andollarsPaak.balanceOf(accounts[0]);
        const balance2 = await witherBills.balanceOf(accounts[0]);
        const balance3 = await smoniy.balanceOf(accounts[0]);
        assert.equal(balance0.toString(10) , web3.toWei("1000000", "ether"));
        assert.equal(balance1.toString(10) , web3.toWei("2000000", "ether"));
        assert.equal(balance2.toString(10) , web3.toWei("3000000", "ether"));
        assert.equal(balance3.toString(10) , web3.toWei("4000000", "ether"));
        assert.equal(balance4.toString(10) , web3.toWei("0", "ether"));
    });

    it.only('test test', async () => {
        // const coord0 = {x: 100, y: 200};
        // const coords = [coord0, coord0, coord0];
        // const worked = await coordsCon.loopCoords(coords);
        const coord0 = await coordsCon.coordMaker(100, 200);
        const worked = await coordsCon.justCoord(coord0);
        assert.isTrue(false);
    });

    // it.only('succesfully executes transfer of assets', async () => {
    //     const maker = accounts[0];
    //     const taker = accounts[1];
    //     const makerValue = web3.toWei("1000000", "ether");
    //     const takerValue = web3.toWei("2000000", "ether")
    //     const makerSignature = ecdsaApi.signMessageComplex({
    //         callingAddress: dexchange.address,
    //         makerValue,
    //         nonce: 0,
    //         sender: accounts[0],
    //     });
    //     const takerSignature = ecdsaApi.signMessageComplex({
    //         callingAddress: dexchange.address,
    //         takerValue,
    //         nonce: 0,
    //         sender: accounts[1],
    //     });
    //     const orderHash = ecdsaApi.encodeAndHash(makerSignature, takerSignature);

    //     const order0 = {
    //         maker,
    //         taker,
    //         makerToken: arethaFrankloans.address,
    //         takerToken: andollarsPaak.address,
    //         makerTokenAmount: makerValue,
    //         takerTokenRequested: takerValue,
    //         takerTokenSupplied: takerValue,
    //         makerSignature,
    //         takerSignature,
    //         fillingPartial: false,
    //         orderHash,
    //     }

    //     const orders = [order0];

    //     await dexchange.fillOrders(orders);
    //     // assert.isTrue(false);
    // });
});