const aztec = require('./aztec');
const erc20 = require('./erc20');
const aztecToken = require('./aztecToken');
const doorbell = require('./doorbell');

function generateContracts(database) {
    return {
        aztec: aztec(database),
        erc20: erc20(database),
        aztecToken: aztecToken(database),
        doorbell: doorbell(database),
    };
}

module.exports = generateContracts;
