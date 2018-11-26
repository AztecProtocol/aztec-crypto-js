const aztec = require('./aztec');
const erc20 = require('./erc20');

function generateContracts(database) {
    return {
        aztec: aztec(database),
        erc20: erc20(database),
    };
}

module.exports = generateContracts;
