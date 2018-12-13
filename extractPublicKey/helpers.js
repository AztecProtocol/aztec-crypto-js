const web3Utils = require('web3-utils');
const Tx = require('ethereumjs-tx');
const ethUtils = require('ethereumjs-util');

const doorbell = require('../build/contracts/Doorbell.json');
const web3 = require('./web3Config.js');


const deployContract = async () => {
    const accounts = await web3.eth.getAccounts();
    const contractObject = await (new web3.eth.Contract(doorbell.abi)).deploy({ data: doorbell.bytecode });
    const contractInstance = await contractObject.send({ from: accounts[0], gas: 1000000 });

    return contractInstance.options.address;
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
    const transactionData = (await Promise.all(transactionArray.map(t => web3.eth.getTransaction(t)))).find(r => r.from === userAddress);
    return transactionData;
};

const getTransactionHashesFromBlock = async (extractedBlockNumber) => {
    const block = await web3.eth.getBlock(extractedBlockNumber);

    if (block === undefined) {
        return [];
    }
    return block.transactions;
};

const getKey = async (txData) => {
    const mesgHash = await constructMesgHash(txData);
    let vNumber = web3Utils.hexToNumber(txData.v);
    vNumber -= (await web3.eth.net.getId()) * 2 + 8; // removing the chainID component from v
    return ethUtils.bufferToHex(ethUtils.ecrecover(mesgHash, vNumber, txData.r, txData.s));
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
