const web3Utils = require('web3-utils');

const deployer = require('../deployer');
const transactions = require('../transactions/transactions');
const db = require('../../db/db');
const { t2 } = require('../../../aztec-crypto-js/params');
const noteController = require('../../note/controller');

const AZTECERC20Bridge = require('../../../build/contracts/AZTECERC20Bridge.json');

const { web3 } = deployer;
const { padLeft } = web3Utils;

const aztecToken = {};

aztecToken.deployAztecToken = async (address, aztecAddress, erc20Address, scalingFactor) => {
    const wallet = db.wallets.get(address);
    const aztecDb = db.contracts.aztecToken.get();
    const aztecContract = new web3.eth.Contract(AZTECERC20Bridge.abi, aztecDb.latest.contractAddress);

    // link to aztec verifier
    const bytecode = AZTECERC20Bridge.bytecode.replace('__AZTECInterface________________________', aztecAddress.slice(2));

    if (aztecDb && aztecDb.latest.bytecode === bytecode) {
        throw new Error('aztec contract already deployed at address ', aztecDb.latest.address);
    }

    const transactionHash = await deployer.deployContract(
        aztecContract,
        wallet,
        bytecode,
        t2,
        erc20Address,
        scalingFactor
    );
    // add transaction
    db.transactions.create({
        status: 'SENT',
        type: 'CREATE_AZTEC_TOKEN',
        transactionHash,
    });
    db.contracts.aztecToken.create({
        bytecode,
        contractAddress: '',
        transactionReceipt: {},
        transactionHash,
    });
    return transactionHash;
};

aztecToken.updateAztecToken = async (transactionHash) => {
    const transactionReceipt = await transactions.getTransactionReceipt(transactionHash);
    return db.contracts.aztecToken.update(transactionHash, {
        contractAddress: transactionReceipt.contractAddress,
        transactionReceipt,
        transactionHash,
    });
};

aztecToken.confidentialTransfer = async (address, proofData, m, challenge, inputSignatures, outputOwners, metadata) => {
    const wallet = db.wallets.get(address);
    const aztecDb = db.contracts.aztecToken.get();
    if (!aztecDb.latest.contractAddress) {
        throw new Error('could not find deployed aztec contract');
    }
    const aztecContract = new web3.eth.Contract(AZTECERC20Bridge.abi, aztecDb.latest.contractAddress);
    aztecContract.contractAddress = aztecDb.latest.contractAddress;

    const transactionHash = await deployer.methodCall(
        aztecContract,
        wallet,
        'confidentialTransfer',
        proofData,
        m,
        challenge,
        inputSignatures,
        outputOwners,
        metadata
    );

    // add transaction
    db.transactions.create({
        status: 'SENT',
        type: 'AZTEC_TOKEN_CONFIDENTIAL_TRANSFER',
        transactionHash,
    });

    return transactionHash;
};

aztecToken.updateJoinSplitTransaction = async (transactionHash) => {
    const transactionReceipt = await deployer.getTransactionReceipt(transactionHash);

    const transactionData = await deployer.getTransaction(transactionHash);
    // // fish out notes from input data
    const { inputs } = AZTECERC20Bridge.abi.find(v => ((v.name === 'confidentialTransfer') && (v.type === 'function')));
    inputs[inputs.length - 1].name = 'metadata';
    const { notes, m } = web3.eth.abi.decodeParameters(
        inputs,
        `0x${transactionData.input.slice(10)}`
    );

    const inputNoteHashes = notes.slice(0, m).map((note) => {
        const noteString = note.slice(2).reduce((acc, s) => `${acc}${padLeft(s.slice(2), 64)}`, '0x');
        return web3Utils.sha3(noteString, 'hex');
    });
    const outputNoteHashes = notes.slice(m, notes.length).map((note) => {
        const noteString = note.slice(2).reduce((acc, s) => `${acc}${padLeft(s.slice(2), 64)}`, '0x');
        return web3Utils.sha3(noteString, 'hex');
    });

    inputNoteHashes.forEach((noteHash) => { noteController.setNoteStatus(noteHash, 'SPENT'); });
    outputNoteHashes.forEach((noteHash) => { noteController.setNoteStatus(noteHash, 'UNSPENT'); });
    db.transactions.update(transactionHash, {
        status: 'MINED',
        transactionReceipt,
        transactionData,
    });
};

aztecToken.contract = (contractAddress) => {
    return new web3.eth.Contract(AZTECERC20Bridge.abi, contractAddress);
};

module.exports = aztecToken;
