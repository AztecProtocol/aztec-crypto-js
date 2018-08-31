/* global artifacts, assert, contract, beforeEach, it:true */
const SecurityTest = artifacts.require('./contracts/Security/SecurityTest');

const ecdsaApi = require('../helpers/ecdsaApi');

contract('Security', (accounts) => {
    let contract;
    beforeEach(async () => {
        contract = await SecurityTest.new({
            from: accounts[0],
        });
    });

    it('has correct initial whitelist', async () => {
        const whitelisted = await contract.whitelist(accounts[0]);
        const notWhitelisted = await contract.whitelist(accounts[1]);
        assert.equal(whitelisted, 1);
        assert.equal(notWhitelisted, 0);
    });

    it('succesfully validates an ecdsa signature', async () => {
        const signature = ecdsaApi.signMessage({
            callingAddress: accounts[1],
            sender: accounts[0],
        });
        // we call this function using address[1], but signed by address[0]
        const isWhitelisted = await contract.validateWhitelist(
            signature.r,
            signature.s,
            signature.v,
            {
                from: accounts[1],
            },
        );

        assert.equal(isWhitelisted, 1);
    });
});
