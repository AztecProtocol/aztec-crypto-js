const transactions = require('./transactions');

const jobs = {};

jobs.getTransactionReceipt = async function getTransactionReceipt(job) {
    return Promise.resolve(await transactions.getTransactionReceipt(job.data.transactionHash));
};

module.exports = jobs;
