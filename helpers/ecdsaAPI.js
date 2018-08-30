
// Module that uses web3.js to sign an ECDSA signature over a sha3 hash of the order data
// can be used to validate the legitimacy of an order inside the smart contract
const Web3 = require('web3');

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:9545'));

const ecdsaApi = {};

// toBytes32
// takes a string/integer and converts to a padded 32-byte hexadecimal representation
// the solidity keccak256 function works on 32-byte padded blocks
// e.g. consider the keccak256 hash of the following two variables
// address: 0xc5fdf4076b8f3a5357c5e395ab970b5b54098fef
// uint8:   9
// The hashing function will hash the following block of data (split over 2 lines):
// 000000000000000000000000c5fdf4076b8f3a5357c5e395ab970b5b54098fef
// 0000000000000000000000000000000000000000000000000000000000000009
// So we need to mimic this or the signature validation inside a smart contract will fail
// as the messages will be different!
const toBytes32 = (input, padding = 'left') => { // assumes hex format
    let s = input;
    if (s.length > 64) {
        throw new Error(`string ${input} is more than 32 bytes long!`);
    }
    while (s.length < 64) {
        if (padding === 'left') { // left pad to hash a number. Right pad to hash a string
            s = `0${s}`;
        } else {
            s = `${s}0`;
        }
    }
    return s;
};

ecdsaApi.signMessage = ({
    callingAddress,
    sender,
}) => {
    const signatureMessage = `0x${toBytes32(Number(callingAddress))}`;
    const signature = web3.eth.sign(sender, signatureMessage);
    return {
        r: signature.slice(0, 66), // first 2 chars are '0x'
        s: `0x${signature.slice(66, 130)}`,
        v: Number(signature.slice(130, 132)) + 27, // https://github.com/ethereum/wiki/wiki/JavaScript-API#web3ethsign
    };
};

module.exports = ecdsaApi;
