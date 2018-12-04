const ethUtils = require('ethereumjs-util');

const helpers = require('../helpers/extractHelpers');


async function extractPublicKey(userAddress, doorbellAddress) {
    const extractedBlockNumber = await contractInstance.methods.addressBlockMap(userAddress).call();

    if (extractedBlockNumber === 0) {
        throw new Error('The Ethereum address in question has not rung Doorbell.sol');
    }
    const transactionArray = await helpers.getTransactionHashesFromBlock(extractedBlockNumber);

    // Get the ecdsa parameters and appropriate transaction hash
    const [ecdsaParams, returnTx] = await helpers.getECDSAParams(transactionArray, userAddress);

    // Extract the public key
    const publicKeyBuffer = await helpers.getKey(returnTx, ecdsaParams.v, ecdsaParams.r, ecdsaParams.s);
    const publicKey = ethUtils.bufferToHex(publicKeyBuffer);

    return publicKey;
}

module.exports = extractPublicKey;
