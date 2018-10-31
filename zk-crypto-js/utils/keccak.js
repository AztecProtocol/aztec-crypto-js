const BN = require('bn.js');
const Web3 = require('web3');

const { bnToHex, toBytes32 } = require('./utils');
const { groupReduction } = require('../params');

const web3 = new Web3();

function hashStrings(inputArr) {
    if (!Array.isArray(inputArr)) {
        throw new Error(`expected ${inputArr} to be of type 'array'`);
    }
    const input = `${inputArr.map((i) => {
        const res = toBytes32(i);
        return res;
    }).join('')}`;
    const result = web3.utils.sha3(`0x${input}`, 'hex').slice(2);
    return web3.utils.sha3(`0x${input}`, 'hex').slice(2);
};

function Hash() {
    this.data = [];
};

Hash.prototype.append = function append(point) {
    this.data.push(toBytes32(point.x.fromRed().toString(16)));
    this.data.push(toBytes32(point.y.fromRed().toString(16)));
}

Hash.prototype.appendBN = function append(scalar) {
    this.data.push(toBytes32(scalar.toString(16)));
}

Hash.prototype.keccak = function keccak() {
    const result = hashStrings(this.data);
    this.data = [result];
}

Hash.prototype.toGroupScalar = function toGroupScalar() {
    return new BN(this.data[0], 16).toRed(groupReduction);
}

Hash.prototype.toBytes32 = function toBytes32() {
    return bnToHex(new BN(this.data[0], 16));
}

module.exports = Hash;
