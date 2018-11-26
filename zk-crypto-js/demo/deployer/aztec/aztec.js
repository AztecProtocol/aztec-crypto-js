const deployer = require('../deployer');
const transactions = require('../transactions/transactions');

const db = require('../../db/db');

const AZTEC = require('../../../../build/contracts/AZTEC.json');
const AZTECInterface = require('../../../../build/contracts/AZTECInterface.json');

const { web3 } = deployer;
AZTEC.abi = AZTECInterface.abi; // hon hon hon

const aztec = {};

aztec.deployAztec = async (address) => {
    const wallet = db.wallets.get(address);
    const aztecDb = db.contracts.aztec.get();
    const aztecContract = new web3.eth.Contract(AZTEC.abi, aztecDb.latest.contractAddress);

    if (aztecDb && aztecDb.latest.bytecode === AZTEC.bytecode) {
        throw new Error('aztec contract already deployed at address ', aztecDb.latest.address);
    }
    const transactionHash = await deployer.deployContract(aztecContract, wallet, AZTEC.bytecode);
    // add transaction
    db.transactions.create({
        status: 'SENT',
        type: 'CREATE_AZTEC',
        transactionHash,
    });
    db.contracts.aztec.create({
        bytecode: AZTEC.bytecode,
        contractAddress: '',
        transactionReceipt: {},
        transactionHash,
    });
    return transactionHash;
};

aztec.updateAztec = async (transactionHash) => {
    const transactionReceipt = await transactions.getTransactionReceipt(transactionHash);
    return db.contracts.aztec.update(transactionHash, {
        bytecode: AZTEC.bytecode,
        contractAddress: transactionReceipt.contractAddress,
        transactionReceipt,
        transactionHash,
    });
};

aztec.joinSplit = async (address, proofData, m, challenge, t2Formatted) => {
    const wallet = db.wallets.get(address);
    const aztecDb = db.contracts.aztec.get();
    if (!aztecDb.latest.contractAddress) {
        throw new Error('could not find deployed aztec contract');
    }
    const aztecContract = new web3.eth.Contract(AZTEC.abi, aztecDb.latest.contractAddress);
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

module.exports = aztec;
