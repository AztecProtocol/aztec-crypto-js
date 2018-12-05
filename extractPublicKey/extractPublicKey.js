const ethUtils = require('ethereumjs-util');

const helpers = require('./helpers');


async function extractPublicKey(userAddress, contractInstance) {
    const extractedBlockNumber = await contractInstance.methods.addressBlockMap(userAddress).call();

    if (extractedBlockNumber === 0) {
        throw new Error('The Ethereum address in question has not rung Doorbell.sol');
    }
    const transactionArray = await helpers.getTransactionHashesFromBlock(extractedBlockNumber);

    // Get the ecdsa parameters and appropriate transaction hash
    const txData = await helpers.getECDSAParams(transactionArray, userAddress);

    // Extract the public key
    const publicKeyBuffer = await helpers.getKey(txData.hash, txData.v, txData.r, txData.s);
    const publicKey = ethUtils.bufferToHex(publicKeyBuffer);

    return publicKey;
}

module.exports = extractPublicKey;
