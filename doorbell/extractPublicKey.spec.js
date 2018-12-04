/* eslint-disable prefer-destructuring */
const Web3 = require('web3');
const chai = require('chai');
const ethUtils = require('ethereumjs-util');
const crypto = require('crypto');
const Tx = require('ethereumjs-tx'); // a module for creating, manipulating and signing ethereum transactions

const helpers = require('../helpers/extractHelpers'); // convention is to not put exentions (e.g. .js) for relative imports
const ecdsa = require('../zk-crypto-js/secp256k1/ecdsa');
const extractPublicKey = require('./extractPublicKey');

const { expect } = chai;

const web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:8545')); // connection instance

describe('Series of tests to validate Doorbell smart contract and utility script functionality', () => {
    describe('Validating on chain smart contract pinging script', () => {
        let contractInstance;
        let accounts;
        let userAddress;
        let blockNumber;
        let extractedNumber;

        before(async () => {
            contractInstance = await helpers.deployContract();
            accounts = await web3.eth.getAccounts();
            userAddress = accounts[7];
            blockNumber = await contractInstance.methods.getBlock().send({ from: userAddress });
        });

        it('validate that we can recover the block number of an address', async () => {
            extractedNumber = await contractInstance.methods.addressBlockMap(userAddress).call();
            expect(blockNumber.blockNumber.toString()).to.equal(extractedNumber);
        });
    });

    describe('Validating off chain utility script methods', () => {
        let contractInstance;
        let accounts;
        let userAddress;
        let initialTxHash;
        let extractedNumber;
        let transactionArray;
        let ecdsaParams;
        let returnTx;


        before(async () => {
            contractInstance = await helpers.deployContract();
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

        it('validate that we can detect the transaction in the block', async () => {
            transactionArray = await helpers.blockTxList(extractedNumber);

            // Looping through the list of transactions in the block, checking if tx is in there
            let i;
            let result;
            for (i = 0; i < transactionArray.length; i++) {
                if (initialTxHash === transactionArray[i]) { // tx is the stored tx-hash
                    result = true;
                } else {
                    result = false;
                }
            }
            expect(result).to.equal(true);
        });

        it('validate that we can recover ecdsa params for a sending address from an array of tx hashes', async () => {
            transactionArray.push('o8xhek2omfhfgkl'); // this is an arbitary, fake transaction hash - used for testing purposes
            [ecdsaParams, returnTx] = await helpers.getECDSAParams(transactionArray, userAddress);
            expect(returnTx).to.equal(initialTxHash);
        });

        it('validate that the two methods that calculate the address from the public key, give consistent outputs', async () => {
            const publicKeyBuffer = await helpers.getKey(returnTx, ecdsaParams.v, ecdsaParams.r, ecdsaParams.s);
            const publicKey = ethUtils.bufferToHex(publicKeyBuffer);
            expect(helpers.publicKeyToAddress1(publicKeyBuffer)).to.equal(helpers.publicKeyToAddress2(publicKey));
        });

        it('validate that the public key can be successfully extracted from ecdsa parameters', async () => {
            const publicKeyBuffer = await helpers.getKey(returnTx, ecdsaParams.v, ecdsaParams.r, ecdsaParams.s);
            const publicKey = ethUtils.bufferToHex(publicKeyBuffer);
            expect(typeof (publicKey)).to.equal('string');
            expect(publicKey.slice(0, 2)).to.equal('0x');
            expect(publicKey.length).to.equal(130);
            expect(helpers.publicKeyToAddress1(publicKeyBuffer)).to.equal(userAddress);
        });

        it('Validating that the extractPublicKey script successfully extracts the public key', async () => {
            const publicKey = await extractPublicKey(userAddress, contractInstance);
            expect(typeof (publicKey)).to.equal('string');
            expect(publicKey.length).to.equal(130);
            expect(helpers.publicKeyToAddress1(publicKey)).to.equal(userAddress);
        });
    });
});
