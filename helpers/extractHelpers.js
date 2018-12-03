const web3Utils = require('web3-utils');
const Tx = require('ethereumjs-tx');
const ethUtils = require('ethereumjs-util');

const DOORBELL = require('../build/contracts/doorbell.json');

const deployContract = async (web3) => {
    const accounts = await web3.eth.getAccounts();

    const result = await new web3.eth.Contract(DOORBELL.abi);
    const deployed = await result.deploy({ data: DOORBELL.bytecode });

    const contractInstance = await deployed.send({ from: accounts[0], gas: 1000000 });
    return contractInstance;
};

const constructMesgHash = async (web3, tx) => {
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

const getECDSAParams = async (web3, hash) => {
    const receipt = await web3.eth.getTransaction(hash);

    const { v, r, s } = receipt;
    return { v, r, s };
};

const blockTxList = async (web3, extractedNumber) => {
    const block = await web3.eth.getBlock(extractedNumber);
    return block.transactions;
};

const getKey = async (web3, transactionHash) => {
    const { v, r, s } = await getECDSAParams(web3, transactionHash);
    const tx = await web3.eth.getTransaction(transactionHash);
    const mesgHash = await constructMesgHash(web3, tx);
    // console.log('recovered message = ', mesgHash.toString('hex'));
    let vNumber = web3Utils.hexToNumber(v);
    vNumber -= (await web3.eth.net.getId()) * 2 + 8;
    const publicKeyBuffer = await ethUtils.ecrecover(mesgHash, vNumber, r, s);
    // console.log('public key = ', publicKeyBuffer.toString('hex'));
    return publicKeyBuffer;
};

const publicKeyToAddress1 = (publicKeyBuffer) => {
    const addressBuffer = ethUtils.pubToAddress(publicKeyBuffer);
    const address = web3Utils.toChecksumAddress(ethUtils.bufferToHex(addressBuffer));
    return address;
};

const publicKeyToAddress2 = (publicKey) => {
    const publicHash = web3Utils.sha3(publicKey);
    return web3Utils.toChecksumAddress(`0x${publicHash.slice(-40)}`);
};

module.exports = {
    deployContract,
    getECDSAParams,
    blockTxList,
    getKey,
    constructMesgHash,
    publicKeyToAddress1,
    publicKeyToAddress2,
};
