const Web3 = require('web3');

const ecdsa = require('./ecdsa');
const web3 = new Web3();

const signatures = {};

signatures.constructFundSignature = (
    privateKey,
    note,
    dealSize,
) => {
    if (note.length !== 4) {
        throw new Error(`note ${note} malformed`);
    }
    const parameters = web3.eth.abi.encodeParameters(
        ['bytes32', 'bytes32', 'bytes32', 'bytes32', 'uint'],
        [...note, dealSize],
    );
    const message = web3.utils.sha3(parameters);
    console.log('private key = ', privateKey);
    console.log('message = ', message);
    return {
        signature: ecdsa.signMessage(message, privateKey),
        message,
    };
};

signatures.constructBorrowerSignature = (
    privateKey,
    fundSignatures,
    executionDocument,
    dealSize,
) => {
    const parameters = web3.eth.abi.encodeParameters(
        ['uint[3][]', 'bytes32', 'uint'],
        [ fundSignatures, executionDocument, dealSize ],
    );
    const message = web3.utils.soliditySha3(parameters);
    return {
        signature: ecdsa.signMessage(message, privateKey),
        message,
    };
};
module.exports = signatures;