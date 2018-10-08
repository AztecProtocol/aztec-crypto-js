const BN = require('bn.js');
const fs = require('fs');

const setup = {};
const { FIELD_MODULUS, SIGNATURES_PER_FILE } = require('../params');
const utils = require('../utils/utils');

setup.readSignature = (inputValue) => {
    const value = Number(inputValue);
    return new Promise((resolve, reject) => {
        const fileNum = Math.ceil(Number(value) / SIGNATURES_PER_FILE);
        const fileName = `../zk-crypto-cpp/setupDatabase/data${/* 1 + */(fileNum * SIGNATURES_PER_FILE)}.dat`;
        fs.readFile(fileName, (err, data) => {
            if (err) {
                return reject(err);
            }
            // each file starts at 1 (1, 1025, 2049 etc)
            const min = ((fileNum - 1) * SIGNATURES_PER_FILE) + 1;
            const bytePosition = ((value - min) * 32);
            const signatureBuf = new Buffer.alloc(32);
            data.copy(signatureBuf, 0, bytePosition, bytePosition + 32);


            const x = new BN(signatureBuf);
            // eslint-disable-next-line no-bitwise
            resolve(utils.decompress(x));
        });
    });
};

module.exports = setup;