const Tx = require('ethereumjs-tx');

const config = require('../config');

const web3 = require('../web3Listener');
const basicWallet = require('../basicWallet/basicWallet'); // todo put in controllers

function getTransactionHash(transaction) {
    if (config.env === 'TEST') {
        return `0x${transaction.hash(false).toString('hex')}`;
    }
    return `0x${transaction.hash(true).toString('hex')}`;
}

// utility function to add 0 - 999 gas to the amount of gas sent in a transaction.
// This is a nasty hack to work around how ganache-core calculates transaction hashes,
// it uses EIP-155 (https://github.com/ethereum/EIPs/blob/master/EIPS/eip-155.md) to get the transaction hash,
// instead of hashing the rlp-encoded data of the signed transaction.
// This makes the same transaction sent by different accounts resolve to the same tx hash.
// Adding in a bit of noise to the amount of gas sent creates transaction hashes that are more collision resistant.
// This is needed because of the way we identify mined transactions - we poll our node for a transactionReceipt at
// regular intervals. However this was causing ganache-cli to give us the transactionReceipt
// of a previously mined transaction (with the same transaction hash).
// (we use this polling method because websockets time out after 30 mins, and main-net calls can take longer than that to resolve)
function addNoise() {
    return Math.ceil(Math.random() * 1000);
}

// ### wrappers
const constructorWrapper = (contract, bytecode, ...params) => {
    return async function constructor(wallet) {
        const deployBase = contract.deploy({ data: bytecode, arguments: params });
        const transaction = new Tx({
            nonce: wallet.nonce,
            gas: web3.utils.toHex(addNoise() + await deployBase.estimateGas({ from: wallet.address })),
            gasPrice: web3.utils.toHex(web3.utils.toWei(config.gasPrice, 'gwei')),
            data: deployBase.encodeABI(),
            from: wallet.address,
            chainId: web3.utils.toHex(await web3.eth.net.getId()),
        });

        transaction.sign(Buffer.from(wallet.privateKey.slice(2), 'hex'));
        const transactionHash = getTransactionHash(transaction);
        const result = web3.eth.sendSignedTransaction(`0x${transaction.serialize().toString('hex')}`);

        basicWallet.update(
            wallet.address,
            { nonce: Number(wallet.nonce) + 1 }
        );

        return {
            transactionHash,
            transaction: result,
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
            nonce: wallet.nonce,
            gas: web3.utils.toHex(Math.floor(Number(gas) * 1.1) + addNoise()),
            gasPrice: web3.utils.toHex(web3.utils.toWei(config.gasPrice, 'gwei')),
            data: contract.methods[method](...params).encodeABI(),
            from: wallet.address,
            to: contract.contractAddress,
            chainId: web3.utils.toHex(await web3.eth.net.getId()),
        });
        transaction.sign(Buffer.from(wallet.privateKey.slice(2), 'hex'));
        const transactionHash = getTransactionHash(transaction);
        const result = web3.eth.sendSignedTransaction(`0x${transaction.serialize().toString('hex')}`);
        basicWallet.update(
            wallet.address,
            { nonce: Number(wallet.nonce) + 1 }
        );
        return {
            transactionHash,
            transaction: result,
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
