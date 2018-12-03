/* global, beforeEach, it:true */

const DOORBELL = require('../build/contracts/doorbell.json');
const Web3 = require('web3');
const helpers = require('../helpers/extractHelpers.js');


// Deploy the contract

/*
async function extractPublicKey() {
    // Extract the block number
    const blockNumber = await contractInstance.methods.addressBlockMap(userAddress).call();
    console.log('blockNumber:', blockNumber);

    // Now need to output all transactions contained within the block number
    const block = await web3.eth.getBlock(blockNumber);
    const blockTransactions = block.transactions;
    console.log('block:', blockTransactions);
};

extractPublicKey();
*/


// await contractInstance.methods.getBlock({from: userAddress }).call()


// const number = deployedContract.getBlock({ from: userAddress });
// console.log('current block info:', number);
// console.log('current block number:', number[blockNumber]);

/*
async function extractPublicKey(userAddress, doorbellAddress) {
    // Initialising the contract on an ethereum address and providing the abi
    const doorbellContract = new web3.eth.Contract(DOORBELL.abi, doorbellAddress); 
    

    // Extract the relevant blockNumber
    // Input the hash of the transaction into web3.eth.getTransaction. It then returns v, r, s
    // Use ecrecover on v, r and s to recover public key
    // Return the public key

    const blockNumber = await doorbellContract.methods.getMapping(userAddress).call();

    // Need to get txHash from somewhere

    const result = web3.eth_getTransactionByHash(txHash);

    // Spit out the results
    const v = result.v;
    const r = result.r;
    const s = result.s;
    
    const publicKey = web3.ecrecover(txHash, v, r, s);

    return (publicKey, userAddress);

    
    Questions:
    0) Go through the rough approach to the code I've written so far
    1) Does the above make sense
    2) I need the transaction hash as an input into step 2 above. Do I need to create a mapping in the 
    smart contract doorbell.sol that also stores this?
    3) How does this actually run together with the smart contract script? Does the smart contract 
    get called each time extractPublicKey is instantiated?
    
};
*/