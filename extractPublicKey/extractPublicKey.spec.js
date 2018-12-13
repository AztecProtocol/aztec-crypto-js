/* eslint-disable prefer-destructuring */
const chai = require('chai');
const crypto = require('crypto');
const Tx = require('ethereumjs-tx'); // a module for creating, manipulating and signing ethereum transactions

const helpers = require('./helpers'); // convention is to not put exentions (e.g. .js) for relative imports
const ecdsa = require('../zk-crypto-js/secp256k1/ecdsa');
const extractPublicKey = require('./extractPublicKey');
const web3 = require('./web3Config.js');
const Doorbell = require('../build/contracts/doorbell.json');


const { expect } = chai;

describe('Series of tests to validate Doorbell smart contract and utility script functionality', () => {
    describe('Validating on chain smart contract pinging script', () => {
        let contractAddress;
        let accounts;
        let userAddress;
        let blockNumber;
        let extractedNumber;
        let contractInstance;

        before(async () => {
            contractAddress = await helpers.deployContract();
            contractInstance = new web3.eth.Contract(Doorbell.abi, contractAddress);
            accounts = await web3.eth.getAccounts();
            userAddress = accounts[0];
            blockNumber = await contractInstance.methods.setBlock().send({ from: userAddress });
        });

        it('validate that we can recover the block number of an address', async () => {
            extractedNumber = await contractInstance.methods.addressBlockMap(userAddress).call();
            expect(blockNumber.blockNumber.toString()).to.equal(extractedNumber);
        });
    });

    describe('Validating off chain utility script methods', () => {
        let contractAddress;
        let accounts;
        let userAddress;
        let testAddress;
        let initialTxHash;
        let extractedNumber;
        let transactionArray;
        let testTxHash;
        let txData;
        let contractInstance;

        before(async () => {
            contractAddress = await helpers.deployContract();
            contractInstance = new web3.eth.Contract(Doorbell.abi, contractAddress);

            accounts = await web3.eth.getAccounts();

            const userAccount = ecdsa.keyPairFromPrivate(`0x${crypto.randomBytes(32).toString('hex')}`);
            const userPrivateKey = userAccount.privateKey;
            userAddress = userAccount.address;

            await web3.eth.sendTransaction({
                from: accounts[0],
                to: userAddress,
                value: web3.utils.toHex(web3.utils.toWei('0.5', 'ether')),
                gas: 100000,
                gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
            });

            const testAccount = ecdsa.keyPairFromPrivate(`0x${crypto.randomBytes(32).toString('hex')}`);
            const testPrivateKey = testAccount.privateKey;
            testAddress = testAccount.address;

            await web3.eth.sendTransaction({
                from: accounts[0],
                to: testAddress,
                value: web3.utils.toHex(web3.utils.toWei('0.5', 'ether')),
                gas: 100000,
                gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
            });

            const transaction = new Tx({
                nonce: await web3.eth.getTransactionCount(userAddress),
                gas: web3.utils.toHex(100000),
                gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
                data: await contractInstance.methods.setBlock().encodeABI(),
                from: userAddress,
                to: contractAddress,
                chainId: web3.utils.toHex(await web3.eth.net.getId()),
            });

            const testTransaction = new Tx({
                nonce: await web3.eth.getTransactionCount(testAddress),
                gas: web3.utils.toHex(1000000),
                gasPrice: web3.utils.toHex(web3.utils.toWei('10', 'gwei')),
                from: testAddress,
                to: accounts[1],
                chainId: web3.utils.toHex(await web3.eth.net.getId()),
            });

            transaction.sign(Buffer.from(userPrivateKey.slice(2), 'hex'));
            testTransaction.sign(Buffer.from(testPrivateKey.slice(2), 'hex'));

            const transactionReceipt = await web3.eth.sendSignedTransaction(`0x${transaction.serialize().toString('hex')}`);
            const testTransactionReceipt = await web3.eth.sendSignedTransaction(`0x${testTransaction.serialize().toString('hex')}`);

            initialTxHash = transactionReceipt.transactionHash;
            testTxHash = testTransactionReceipt.transactionHash;

            extractedNumber = await contractInstance.methods.addressBlockMap(userAddress).call();
        });

        it('validate that we can detect the transaction in the block', async () => {
            transactionArray = await helpers.getTransactionHashesFromBlock(extractedNumber);
            expect(transactionArray).to.contains.members([initialTxHash]);
        });

        it('validate that we can recover ecdsa params for a sending address from an array of tx hashes', async () => {
            transactionArray.push(testTxHash);
            txData = await helpers.getECDSAParams(transactionArray, userAddress);
            expect(txData.hash).to.equal(initialTxHash);
        });

        it('validate that the public key can be successfully extracted from ecdsa parameters', async () => {
            const publicKey = await helpers.getKey(txData);
            expect(typeof (publicKey)).to.equal('string');
            expect(publicKey.slice(0, 2)).to.equal('0x');
            expect(publicKey.length).to.equal(130);
            expect(helpers.publicKeyToAddress(publicKey)).to.equal(userAddress);
        });

        it('Validating that the extractPublicKey script successfully extracts the public key', async () => {
            const publicKey = await extractPublicKey(userAddress, contractAddress);
            expect(typeof (publicKey)).to.equal('string');
            expect(publicKey.length).to.equal(130);
            expect(helpers.publicKeyToAddress(publicKey)).to.equal(userAddress);
        });

        it('Validate that an informative error is returned when attempting to get public key from address that has not rung', async () => {
            const fakeAccount = ecdsa.keyPairFromPrivate(`0x${crypto.randomBytes(32).toString('hex')}`);

            try {
                await extractPublicKey(fakeAccount.address, contractAddress);
                throw new Error();
            } catch (e) {
                expect(e.message).to.equal('This Ethereum address has not rung Doorbell.sol');
            }
        });
    });
});
