const ethUtils = require('ethereumjs-util');

const helpers = require('./helpers');
const web3 = require('./web3Config.js');
const doorbell = require('../build/contracts/doorbell.json');


async function extractPublicKey(userAddress, contractAddress) {
    const contractInstance = new web3.eth.Contract(doorbell.abi, contractAddress);

    const extractedBlockNumber = await contractInstance.methods.addressBlockMap(userAddress).call();

    if (extractedBlockNumber === 0) {
        throw new Error('The Ethereum address in question has not rung Doorbell.sol');
    }
    const transactionArray = await helpers.getTransactionHashesFromBlock(extractedBlockNumber);

    const txData = await helpers.getECDSAParams(transactionArray, userAddress);

    const publicKeyBuffer = await helpers.getKey(txData);
    const publicKey = ethUtils.bufferToHex(publicKeyBuffer);

    return publicKey;
}

module.exports = extractPublicKey;
