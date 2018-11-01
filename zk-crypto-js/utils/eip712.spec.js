const chai = require('chai');
const BN = require('bn.js');

const { expect, assert } = chai;

const eip712 = require('./eip712');
const utils = require('./utils');
const Web3 = require('web3');
const web3 = new Web3();

const { AZTEC_RINKEBY_DOMAIN_PARAMS, AZTEC_NOTE_SIGNATURE } = require('../params.js');

const { EIP712Domain } = AZTEC_NOTE_SIGNATURE.types;
console.log(EIP712Domain);
const struct = eip712.encodeStruct('EIP712Domain', { EIP712Domain });
console.log('struct = ', struct);

const hash = web3.utils.soliditySha3(struct);
console.log('hash = ', hash);

const name = web3.utils.soliditySha3(AZTEC_RINKEBY_DOMAIN_PARAMS.name);
const version = web3.utils.soliditySha3(AZTEC_RINKEBY_DOMAIN_PARAMS.version);
console.log('name = ', name);
console.log('version = ', version);

describe.only('eip712.js tests', () => {
    let simple;
    let complex;
    let exampleStruct;
    before(() => {
        simple = {
            types: {
                Foo: [
                    { name: 'first', type: 'bytes32' },
                    { name: 'second', type: 'uint256' },
                    { name: 'third', type: 'address' }
                ],
            },
            primaryType: 'Foo',
            message: {
                first: '0x13',
                second: 104344,
                third: '0x1234567890abcdef10121234567890abcdef1012'
            },
        };

        alphabetical = {
            types: {
                ZZZ: [{ name: 'foo', type: 'uint' }],
                AAA: [{ name: 'bar', type: 'bytes32' }],
                Top: [
                    { name: 'zfoo', type: 'ZZZ' },
                    { name: 'aBar', type: 'AAA' },
                ],
            },
            primaryType: 'Top',
            message: {
                zFoo: {
                    foo: 'Balthazar Lewis IV Von Dudley',
                },
                aBar: {
                    bar: '0x12345678'
                },
            },
        };

        complex = {
            types: {
                Inner: [
                    { name: 'quibbleRating', type: 'bytes32' },
                    { name: 'flimflamHeirarchy', type: 'uint[4]' },
                ],
                Outer: [
                    { name: 'marbleCredentials', type: 'Inner' },
                    { name: 'eloRating', type: 'uint256' },
                    { name: 'name', type: 'string' },
                ],
            },
            primaryType: 'Outer',
            message: {
                name: 'Reginald Fitzgerald De Vienne III',
                eloRating: '1007',
                marbleCredentials: {
                    quibbleRating: '0x2329',
                    flimflamHeirarchy: [100, 813, '21888242871839275222246405745257275088696311157297823662689037894645226208583', 7],
                },
            },
        };

        exampleStruct = {
            types: {
                Foo: [
                    { name: 'first', type: 'bytes32' },
                    { name: 'second', type: 'uint256' },
                    { name: 'third', type: 'address' },
                ],
                EIP712Domain: [
                    { "name": "name", "type": "string" },
                    { "name": "version", "type": "string" },
                    { "name": "chainId", "type": "uint256" },
                    { "name": "verifyingContract", "type": "address" },
                    { "name": "salt", "type": "bytes32" },
                ],
            },
            primaryType: 'Foo',
            message: {
                first: '0x13',
                second: 104344,
                third: '0x1234567890abcdef10121234567890abcdef1012'
            },
            domain: AZTEC_RINKEBY_DOMAIN_PARAMS,
        };
    });

    it('encodeData will correctly encode a basic struct', () => {
        const encoded = eip712.encodeMessageData(simple.message, simple.types, simple.types[simple.primaryType]);
        expect(encoded).to.equal('0x130000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000197980000000000000000000000001234567890abcdef10121234567890abcdef1012');
    });

    it('encodeData will correctly encode a nested struct', () => {
        const encoded = eip712.encodeMessageData(complex.message, complex.types, complex.types[complex.primaryType]);
        const expected = `0xdcc66a3502c48266f81ee15b636a8ddc6406382ae4f6a1bcc51b23d271f110d200000000000000000000000000000000000000000000000000000000000003ef2329000000000000000000000000000000000000000000000000000000000000d716955403d21f5ddb28253df82b9345ef5dbefeb8e8fb349abf4c95e35cf1e9`;
        expect(encoded).to.equal(expected);
    });

    it('encodeStruct will correctly encode a struct', () => {
        const encoded = eip712.encodeStruct(simple.primaryType, simple.types);
        expect(encoded).to.equal('Foo(first bytes32,second uint256,third address)');
    });

    it('encodeStruct will correctly order struct strings alphabetically', () => {
        const encodedAlphabetical = eip712.encodeStruct(alphabetical.primaryType, alphabetical.types);
        expect(encodedAlphabetical).to.equal('Top(zfoo ZZZ,aBar AAA)AAA(bar bytes32)ZZZ(foo uint)');
    });

    it('hashStruct correctly calculates the keccak256 hash of a struct', () => {
        const hashed = eip712.hashStruct(simple.primaryType, simple.types, simple.message);
        const typeData = 'Foo(first bytes32,second uint256,third address)';
        const typeHash = web3.utils.soliditySha3(typeData);
        const encodedData = '0x130000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000197980000000000000000000000001234567890abcdef10121234567890abcdef1012';
        const expected = web3.utils.sha3(`${typeHash}${encodedData.slice(2)}`);
        expect(hashed).to.equal(expected);
    });

    it('encodeTypedData correctly calculates the encoding for a Struct', () => {
        const encoded = eip712.encodeTypedData(exampleStruct);
        expect(encoded.length === 64);
        console.log('encoded = ', encoded);
    });
});