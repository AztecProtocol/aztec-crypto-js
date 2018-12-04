const web3Utils = require('web3-utils');
const Tx = require('ethereumjs-tx');
const ethUtils = require('ethereumjs-util');

const DOORBELL = require('../build/contracts/doorbell.json');
const web3 = require('./web3Config.js');


const deployContract = async () => {
    const accounts = await web3.eth.getAccounts();

    const result = await new web3.eth.Contract(DOORBELL.abi);
    const deployed = await result.deploy({ data: DOORBELL.bytecode });

    return deployed.send({ from: accounts[0], gas: 1000000 });
};

const constructMesgHash = async (tx) => {
    const transaction = await new Tx({
        nonce: web3.utils.toHex(tx.nonce),
        gas: web3.utils.toHex(tx.gas),
        gasPrice: web3.utils.toHex(tx.gasPrice),
        data: tx.input,
        from: tx.from,
        to: tx.to,
        chainId: web3.utils.toHex(await web3.eth.net.getId()),
    });
    return transaction.hash(false);
};

const getECDSAParams = async (transactionArray, userAddress) => {
    let j;
    let receipt;
    let returnReceipt;
    let returnTx;

    for (j = 0; j < transactionArray.length; j += 1) {
        receipt = await web3.eth.getTransaction(transactionArray[j]);

        if (receipt != null) { // check that the receipt is an actual object
            if (receipt.from === userAddress) { // check that the transaction was sent from the userAddress
                returnReceipt = receipt;
                returnTx = transactionArray[j];
            }
        }
    }
    const { v, r, s } = returnReceipt;
    return [{ v, r, s }, returnTx];
};

const getTransactionHashesFromBlock = async (extractedNumber) => {
    const block = await web3.eth.getBlock(extractedNumber);

    if (block === undefined) {
        return [];
    }
    return block.transactions;
};

const getKey = async (transactionHash, v, r, s) => {
    const tx = await web3.eth.getTransaction(transactionHash);
    const mesgHash = await constructMesgHash(tx);
    let vNumber = web3Utils.hexToNumber(v);
    vNumber -= (await web3.eth.net.getId()) * 2 + 8;
    return ethUtils.bufferToHex(ethUtils.ecrecover(mesgHash, vNumber, r, s));
};

const publicKeyToAddress = (publicKey) => {
    const publicHash = web3Utils.sha3(publicKey);
    return web3Utils.toChecksumAddress(`0x${publicHash.slice(-40)}`);
};


module.exports = {
    deployContract,
    getECDSAParams,
    getTransactionHashesFromBlock,
    getKey,
    constructMesgHash,
    publicKeyToAddress,
};
