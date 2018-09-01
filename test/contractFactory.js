/* global artifacts, assert, contract, beforeEach, it:true */
const ContractFactory = artifacts.require('./contracts/PrimaryDeal/ContractFactory');
const PrimaryDeal = artifacts.require('./contracts/PrimaryDeal/PrimaryDeal');
const Storage = artifacts.require('./contracts/Storage/Storage');

const ecdsaApi = require('../helpers/ecdsaApi');

contract('ContractFactory', (accounts) => {
    let contractFactory;
    let storageTemplate;
    let primaryDealTeplate;
    beforeEach(async () => {
        storageTemplate = await Storage.new(accounts[0]);
        primaryDealTemplate = await PrimaryDeal.new();
        contractFactory = await ContractFactory.new(storageTemplate.address, primaryDealTemplate.address);
    });

    it('has correct initial state', async () => {
        const _initialized = await primaryDealTemplate._initialized();
        const _owner = await storageTemplate._owner();
        assert.equal(_initialized, 1);
        assert.equal(_owner, accounts[0]);
        const _factoryOwner = await contractFactory._owner();
        assert.equal(_factoryOwner, accounts[0]);
    });

    it('succesfully creates PrimaryDeal and Storage contracts', async () => {
        const txReceipt = await contractFactory.createPrimaryDeal(accounts[0], {
            from: accounts[0],
            gas: 4000000
        });
        assert.equal(txReceipt.logs.length, 1);
        const createdPrimaryDealAddress = txReceipt.logs[0].args.primaryDeal;
        const createdPrimaryDeal = PrimaryDeal.at(createdPrimaryDealAddress);
        const _initialized = await createdPrimaryDeal._initialized();
        assert.equal(_initialized, 1);
        console.log(await createdPrimaryDeal.TEST());
    });
});
