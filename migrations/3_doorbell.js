/* global artifacts */
const Doorbell = artifacts.require('./Doorbell.sol');

module.exports = (deployer) => {
    return deployer.deploy(Doorbell);
};
