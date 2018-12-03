/* eslint-disable prefer-destructuring */
const Web3 = require('web3');
const chai = require('chai');
const ethUtils = require('ethereumjs-util');
const crypto = require('crypto');
const Tx = require('ethereumjs-tx'); // a module for creating, manipulating and signing ethereum transactions

const helpers = require('../helpers/extractHelpers'); // convention is to not put exentions (e.g. .js) for relative imports
const extractPublicKey = require('./extractPublicKey');
const ecdsa = require('../zk-crypto-js/secp256k1/ecdsa');

const { expect } = chai;

const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545')); // connection instance

describe('Validating on chain smart contract pinging script', () => {
    let contractInstance;
    let accounts;
    let userAddress;
    let blockNumber;
    let extractedNumber;

    before(async () => {
        contractInstance = await helpers.deployContract(web3);
        accounts = await web3.eth.getAccounts();
        userAddress = accounts[7];

        blockNumber = await contractInstance.methods.getBlock().send({ from: userAddress });
    });

    it('validate that we can recover the block number of an address', async () => {
        /*
        Note:
        - blockNumber is effectively the 'input' block number. It's what the original transaction is
        stored in.
        - extractedNumber is the number that has been extracted from the mapping
        */

        extractedNumber = await contractInstance.methods.addressBlockMap(userAddress).call();

        expect(blockNumber.blockNumber.toString()).to.equal(extractedNumber);
    });
});

describe('Validating off chain utility script methods', () => {
    let contractInstance;
    let accounts;
    let userAddress;
    let initialTxHash;
    let v;
    let s;
    let r;
    let extractedNumber;
    let transactions;

    let blockNumber;

    beforeEach(async () => {
        contractInstance = await helpers.deployContract(web3);
        accounts = await web3.eth.getAccounts();

        const { privateKey, address, publicKey } = ecdsa.keyPairFromPrivate(`0x${crypto.randomBytes(32).toString('hex')}`);

        // Sending transaction to load our manually generated account with ether
        await web3.eth.sendTransaction({
            from: accounts[3],
            to: address,
            value: web3.utils.toHex(web3.utils.toWei('0.5', 'ether')),
            gas: 100000,
            gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
        });

        userAddress = address;

        // Creating raw transaction object for the getBlock() method on the smart contract
        const transaction = new Tx({
            nonce: await web3.eth.getTransactionCount(userAddress),
            gas: web3.utils.toHex(100000),
            gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
            data: await contractInstance.methods.getBlock().encodeABI(),
            from: userAddress,
            to: contractInstance._address,
            chainId: web3.utils.toHex(await web3.eth.net.getId()),
        });

        transaction.sign(Buffer.from(privateKey.slice(2), 'hex'));
        const transactionReceipt = await web3.eth.sendSignedTransaction(`0x${transaction.serialize().toString('hex')}`);

        // Store the transaction hash
        initialTxHash = transactionReceipt.transactionHash;

        // Query the addressBlockMap variable and store it
        extractedNumber = await contractInstance.methods.addressBlockMap(userAddress).call();
    });

    it('validate that we can get the transaction from a block', async () => {
        transactions = await helpers.blockTxList(web3, extractedNumber);
        console.log('transactions in block: ', transactions, 'blockNumber: ', extractedNumber);

        // Looping through the list of transactions in the block, checking if tx is in there
        let i;
        let result;
        for (i = 0; i < transactions.length; i++) {
            if (initialTxHash === transactions[i]) { // tx is the stored tx-hash
                result = true;
            } else {
                result = false;
            }
        }
        expect(result).to.equal(true);
    });

    it('validate that given an array of tx-hashes and an address, we can either 1) recover the address ecdsa parameters OR 2) return an error', async () => {
        // Logic: If the address sent one of the transactions in the input array, then output the appropriate ecdsa parameters. If it not did 
        // send one of the tx-hashes, output an error
        const ecdsa = await helpers.getECDSAParams(web3, transactions, userAddress);
        v = ecdsa.v;
        r = ecdsa.r;
        s = ecdsa.s;
        // Need some sort of check statement, that checks that the address involved has actually sent transactions
    });

    it('validate that the two methods that calculate the address from the public key, give consistent outputs', async () => {
        const publicKeyBuffer = await helpers.getKey(web3, initialTxHash, v, r, s);
        const publicKey = ethUtils.bufferToHex(publicKeyBuffer); // ecrecover returns a buffer, need to convert to hex
        expect(helpers.publicKeyToAddress1(publicKeyBuffer)).to.equal(helpers.publicKeyToAddress2(publicKey));
    });

    it('validate that the public key can be successfully extracted from ecdsa parameters', async () => {
        const publicKeyBuffer = await helpers.getKey(web3, initialTxHash);
        const publicKey = ethUtils.bufferToHex(publicKeyBuffer); // ecrecover returns a buffer, need to convert to hex
        expect(typeof (publicKey)).to.equal('string');
        expect(publicKey.slice(0, 2)).to.equal('0x');
        expect(publicKey.length).to.equal(130);
        expect(helpers.publicKeyToAddress1(publicKeyBuffer)).to.equal(userAddress);
    });
});

/*
describe('Validating that the extractPublicKey module successfully extracts the public key', () => { 
    before(async () => {
        contractInstance = await helpers.deployContract(web3);

    });

    it('validate that public key is of expected format and the correct key', async () => {
        const publicKey = await extractPublicKey(userAddress);
        expect(typeof (publicKey)).to.equal('string');
        expect(publicKey.slice(0, 2)).to.equal('0x');
        expect(publicKey.length).to.equal(130);
        expect(helpers.publicKeyToAddress(publicKey)).to.equal(userAddress);
    });
});
*/
