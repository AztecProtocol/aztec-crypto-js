const Web3 = require('web3');
const web3 = new Web3();

let commit = web3.eth.abi
    .encodeFunctionSignature('validateCommit(bytes32[6][], uint, uint, bytes32[4])');

console.log('commit = ', commit);

let reveal = web3.eth.abi
    .encodeFunctionSignature('validateReveal(bytes32[6][], uint, uint, bytes32[4])');

console.log('reveal = ', reveal);

let joinsplit = web3.eth.abi
    .encodeFunctionSignature('validateJoinSplit(bytes32[6][], bytes32[6][], uint, bytes32[4])');

console.log('joinsplit = ', joinsplit);