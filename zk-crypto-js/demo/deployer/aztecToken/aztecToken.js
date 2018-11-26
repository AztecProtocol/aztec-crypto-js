const deployer = require('../deployer');
const transactions = require('../transactions/transactions');

const db = require('../../db/db');
const { t2Formatted } = require('../../../params');

const AZTECERC20Bridge = require('../../../../build/contracts/AZTEC.json');

const { web3 } = deployer;

const aztecToken = {};

aztecToken.deployAztecToken = async (address, aztecAddress, erc20Address, scalingFactor) => {
    const wallet = db.wallets.get(address);
    const aztecDb = db.contracts.aztec.get();
    const aztecContract = new web3.eth.Contract(AZTECERC20Bridge.abi, aztecDb.latest.contractAddress);
    // link to aztec verifier
    const bytecode = AZTECERC20Bridge.replace('__AZTECInterface________________________', aztecAddress.slice(2));

    if (aztecDb && aztecDb.latest.bytecode === bytecode) {
        throw new Error('aztec contract already deployed at address ', aztecDb.latest.address);
    }

    const transactionHash = await deployer.deployContract(
        aztecContract,
        wallet,
        bytecode,
        t2Formatted,
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

aztecToken.confidentialTransfer = async (address, proofData, m, challenge) => {
    const wallet = db.wallets.get(address);
    const aztecDb = db.contracts.aztec.get();
    if (!aztecDb.latest.contractAddress) {
        throw new Error('could not find deployed aztec contract');
    }
    const aztecContract = new web3.eth.Contract(AZTECERC20Bridge.abi, aztecDb.latest.contractAddress);
    aztecContract.contractAddress = aztecDb.latest.contractAddress;

    const transactionHash = await deployer.methodCall(
        aztecContract,
        wallet,
        'validateJoinSplit',
        proofData,
        m,
        challenge,
        t2Formatted
    );

    // add transaction
    db.transactions.create({
        status: 'SENT',
        type: 'AZTEC_JOIN_SPLIT',
        transactionHash,
    });
    const transactionReceipt = await deployer.getTransactionReceipt(transactionHash);

    db.transactions.update(transactionHash, {
        status: 'SENT',
        type: 'AZTEC_JOIN_SPLIT',
        transactionHash,
        transactionReceipt,
    });
    return transactionHash;
};

module.exports = aztecToken;
