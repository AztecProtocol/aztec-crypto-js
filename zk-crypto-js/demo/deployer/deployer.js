const Web3 = require('web3');
const Tx = require('ethereumjs-tx');

const config = require('../config');

const web3 = new Web3(new Web3.providers.WebsocketProvider(config.provider));

// ### wrappers
const constructorWrapper = (contract, bytecode, ...params) => {
    return async function constructor(wallet) {
        const deployBase = contract.deploy(...params, { data: bytecode });
        const transaction = new Tx({
            nonce: await web3.eth.getTransactionCount(wallet.address),
            gas: web3.utils.toHex(await deployBase.estimateGas({ from: wallet.address })),
            gasPrice: web3.utils.toHex(web3.utils.toWei(config.gasPrice, 'gwei')),
            data: deployBase.encodeABI(),
            from: wallet.address,
        });
        const transactionHash = `0x${transaction.hash().toString('hex')}`;
        transaction.sign(Buffer.from(wallet.privateKey.slice(2), 'hex'));
        return {
            transactionHash,
            transaction: web3.eth.sendSignedTransaction(`0x${transaction.serialize().toString('hex')}`),
        };
    };
};

// TODO: stronger delineation between config variables and method parameters
const methodWrapper = (contract, method, ...params) => {
    return async function methodCall(wallet) {
        const gas = (await contract.methods[method](...params).estimateGas({
            from: wallet.address,
            to: contract.contractAddress,
        }));
        const transaction = new Tx({
            nonce: await web3.eth.getTransactionCount(wallet.address),
            gas: web3.utils.toHex(Math.floor(Number(gas) * 1.1)),
            gasPrice: web3.utils.toHex(web3.utils.toWei(config.gasPrice, 'gwei')),
            data: contract.methods[method](...params).encodeABI(),
            from: wallet.address,
            to: contract.contractAddress,
        });
        const transactionHash = `0x${transaction.hash().toString('hex')}`;
        transaction.sign(Buffer.from(wallet.privateKey.slice(2), 'hex'));
        return {
            transactionHash,
            transaction: web3.eth.sendSignedTransaction(`0x${transaction.serialize().toString('hex')}`),
        };
    };
};

const deployer = {};

deployer.deployContract = async (contract, wallet, bytecode, ...params) => {
    const constructor = constructorWrapper(contract, bytecode, ...params);
    const { transactionHash } = await constructor(wallet);
    return transactionHash;
};

deployer.methodCall = async (contract, wallet, method, ...params) => {
    const methodCall = methodWrapper(contract, method, ...params);
    const { transactionHash } = await methodCall(wallet);
    return transactionHash;
};

deployer.getTransactionReceipt = async (transactionHash) => {
    return new Promise(async (resolve, reject) => {
        let remainingAttempts = 1000;
        let receipt;
        async function recurse() {
            try {
                receipt = await web3.eth.getTransactionReceipt(transactionHash);
            } catch (e) {
                console.error('error? ', e);
            }
            if (receipt) {
                resolve(receipt);
            } else {
                remainingAttempts -= 1;
                if (remainingAttempts) {
                    setTimeout(recurse, 1000);
                } else {
                    reject(new Error('receipt attempt timed out after 1000 attempts'));
                }
            }
        }
        await recurse();
    });
};

deployer.getTransaction = async (transactionHash) => {
    return new Promise(async (resolve, reject) => {
        let remainingAttempts = 1000;
        let transaction;
        async function recurse() {
            try {
                transaction = await web3.eth.getTransaction(transactionHash);
            } catch (e) {
                console.error('error? ', e);
            }
            if (transaction) {
                resolve(transaction);
            } else {
                remainingAttempts -= 1;
                if (remainingAttempts) {
                    setTimeout(recurse, 1000);
                } else {
                    reject(new Error('receipt attempt timed out after 1000 attempts'));
                }
            }
        }
        await recurse();
    });
};

deployer.web3 = web3;

module.exports = deployer;
