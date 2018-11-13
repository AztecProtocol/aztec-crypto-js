const BN = require('bn.js');
const fs = require('fs');
const path = require('path');

const setup = {};
const { SIGNATURES_PER_FILE } = require('../params');
const utils = require('../utils/utils');

const partialPath = path.posix.resolve(__dirname, '../../zk-crypto-cpp/setupDatabase');

setup.readSignature = (inputValue) => {
    const value = Number(inputValue);
    return new Promise((resolve, reject) => {
        const fileNum = Math.ceil(Number(value + 1) / SIGNATURES_PER_FILE);

        const fileName = path.posix.resolve(partialPath, `data${(((fileNum) * SIGNATURES_PER_FILE) - 1)}.dat`);
        fs.readFile(fileName, (err, data) => {
            if (err) {
                return reject(err);
            }
            // each file starts at 0 (0, 1024, 2048 etc)
            const min = ((fileNum - 1) * SIGNATURES_PER_FILE);
            const bytePosition = ((value - min) * 32);
            // eslint-disable-next-line new-cap
            const signatureBuf = new Buffer.alloc(32);
            data.copy(signatureBuf, 0, bytePosition, bytePosition + 32);

            const x = new BN(signatureBuf);
            return resolve(utils.decompress(x));
        });
    });
};

module.exports = setup;
