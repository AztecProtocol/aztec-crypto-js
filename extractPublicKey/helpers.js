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
    // console.log('transaction array: ', transactionArray);
    // this is effectively iterating through every element in transactionArray 
    // console.log('transaction array map', transactionArray.map(t => web3.eth.getTransaction(t)));
    // console.log('promises', await Promise.all(transactionArray.map(t => web3.eth.getTransaction(t))));
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

const getKey = async (transactionHash, v, r, s) => {
    const tx = await web3.eth.getTransaction(transactionHash);
    const mesgHash = await constructMesgHash(tx);
    let vNumber = web3Utils.hexToNumber(v);
    vNumber -= (await web3.eth.net.getId()) * 2 + 8; // removing the chainID component from v
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
