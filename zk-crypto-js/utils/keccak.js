const BN = require('bn.js');
const { sha3, padLeft } = require('web3-utils');

const { bnToHex } = require('./utils');
const { groupReduction } = require('../params');

function hashStrings(inputArr) {
    if (!Array.isArray(inputArr)) {
        throw new Error(`expected ${inputArr} to be of type 'array'`);
    }
    const input = `${inputArr.map((i) => {
        const res = padLeft(i, 64);
        return res;
    }).join('')}`;
    return sha3(`0x${input}`, 'hex').slice(2);
}

function Hash() {
    this.data = [];
}

Hash.prototype.append = function append(point) {
    this.data.push(padLeft(point.x.fromRed().toString(16), 64));
    this.data.push(padLeft(point.y.fromRed().toString(16), 64));
};

Hash.prototype.appendBN = function append(scalar) {
    this.data.push(padLeft(scalar.toString(16), 64));
};

Hash.prototype.keccak = function keccak() {
    const result = hashStrings(this.data);
    this.data = [result];
};

Hash.prototype.toGroupScalar = function toGroupScalar() {
    return new BN(this.data[0], 16).toRed(groupReduction);
};

Hash.prototype.toBytes32 = function hashToBytes32() {
    return bnToHex(new BN(this.data[0], 16));
};

module.exports = Hash;
