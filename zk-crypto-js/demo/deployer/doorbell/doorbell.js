const deployer = require('../deployer');
const transactions = require('../transactions/transactions');

const db = require('../../db/db');

const Doorbell = require('../../../../build/contracts/doorbell.json');

const { web3 } = deployer;

const doorbell = {};

doorbell.deployDoorbell = async (address) => {
    const wallet = db.wallets.get(address);
    const doorbellDb = db.contracts.doorbell.get();

    const doorbellContract = new web3.eth.Contract(Doorbell.abi);

    if (doorbellDb && doorbellDb.latest.bytecode === Doorbell.bytecode) {
        throw new Error('doorbell contract already deployed at address ', doorbellDb.latest.address);
    }
    const transactionHash = await deployer.deployContract(doorbellContract, wallet, Doorbell.bytecode);
    db.transactions.create({
        status: 'SENT',
        type: 'CREATE_doorbell',
        transactionHash,
    });
    db.contracts.doorbell.create({
        bytecode: Doorbell.bytecode,
        contractAddress: '',
        transactionReceipt: {},
        transactionHash,
    });
    return transactionHash;
};

doorbell.updateDoorbell = async (transactionHash) => {
    const transactionReceipt = await transactions.getTransactionReceipt(transactionHash);
    return db.contracts.doorbell.update(transactionHash, {
        bytecode: Doorbell.bytecode,
        contractAddress: transactionReceipt.contractAddress,
        transactionReceipt,
        transactionHash,
    });
};

doorbell.setBlock = async (from) => {
    const doorbellDb = db.contracts.doorbell.get();
    const fromWallet = db.wallets.get(from);
    if (!doorbellDb.latest.contractAddress) {
        throw new Error('could not find deployed doorbell contract');
    }

    const doorbellContract = new web3.eth.Contract(Doorbell.abi, doorbellDb.latest.contractAddress);
    doorbellContract.contractAddress = doorbellDb.latest.contractAddress; // have to set this explicitly

    const transactionHash = await deployer.methodCall(
        doorbellContract,
        fromWallet,
        'setBlock'
    );

    // add transaction
    db.transactions.create({
        status: 'SET',
        type: 'DOORBELL SET BLOCK',
        transactionHash,
    });
    return transactionHash;
};

doorbell.contract = (contractAddress) => {
    return new web3.eth.Contract(Doorbell.abi, contractAddress);
};

module.exports = doorbell;
