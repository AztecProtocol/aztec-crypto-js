const ecdsa = require('../secp256k1/ecdsa');
const eip712 = require('./eip712');
const { AZTEC_NOTE_SIGNATURE, AZTEC_RINKEBY_DOMAIN_PARAMS } = require('../params');
const sign = {};

sign.signNote = function (note, challenge, senderAddress, verifyingContract, privateKey) {
    const messageBase = {
        ...AZTEC_NOTE_SIGNATURE,
        domain: {
            ...AZTEC_RINKEBY_DOMAIN_PARAMS,
            verifyingContract,
        },
        message: {
            note: [note[2], note[3], note[4], note[5]],
            challenge,
            sender: senderAddress,
        },
    };
    const message = eip712.encodeTypedData(messageBase);
    const signature = ecdsa.signMessage(message, privateKey);
    return { message, signature };
};


module.exports = sign;