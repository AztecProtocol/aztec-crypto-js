const deployer = require('../deployer');
const db = require('../../db/db');

const transactions = {};

transactions.getTransactionReceipt = async function getTransactionReceipt(transactionHash) {
    const transaction = db.transactions.get(transactionHash);
    if (!transaction) {
        throw new Error('could not find transaction ', transactionHash);
    }
    const transactionReceipt = await deployer.getTransactionReceipt(transactionHash);
    db.transactions.update(transactionHash, {
        ...transaction,
        status: 'MINED',
        transactionReceipt,
    });
    return transactionReceipt;
};

module.exports = transactions;
