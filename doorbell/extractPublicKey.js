const ethUtils = require('ethereumjs-util');
const helpers = require('../helpers/extractHelpers');


async function extractPublicKey(userAddress, contractInstance) {
    // Extract the block number
    const extractedNumber = await contractInstance.methods.addressBlockMap(userAddress).call();

    // Extract the array of transactions stored in the block
    const transactionArray = await helpers.blockTxList(extractedNumber);

    // Get the ecdsa parameters and appropriate transaction hash
    const [ecdsaParams, returnTx] = await helpers.getECDSAParams(transactionArray, userAddress);

    // Extract the public key
    const publicKeyBuffer = await helpers.getKey(returnTx, ecdsaParams.v, ecdsaParams.r, ecdsaParams.s);
    const publicKey = ethUtils.bufferToHex(publicKeyBuffer);

    return publicKey;
}

module.exports = extractPublicKey;
