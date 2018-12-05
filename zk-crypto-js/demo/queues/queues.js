const QueueFactory = require('./factory');

const aztec = require('../deployer/aztec/jobs');
const erc20 = require('../deployer/erc20/jobs');
const transactions = require('../deployer/transactions/jobs');

const queues = {
    transactions: {},
    aztec: {},
    erc20: {},
};

queues.transactions = QueueFactory('transactions', transactions.getTransactionReceipt);

queues.aztec.update = QueueFactory('updateAztec', aztec.updateAztec);

queues.aztec.deploy = QueueFactory('deployAztec', async (job) => {
    const transactionHash = await aztec.deployAztec(job);
    queues.aztec.update.queue.add({ transactionHash });
    return Promise.resolve(transactionHash);
});


queues.erc20.update = QueueFactory('updateErc20', erc20.updateErc20);

queues.erc20.deploy = QueueFactory('deployErc20', async (job) => {
    const transactionHash = await erc20.deployErc20(job);
    queues.erc20.update.queue.add({ transactionHash });
    return Promise.resolve(transactionHash);
});

queues.erc20.mint = QueueFactory('mintErc20', async (job) => {
    const transactionHash = await erc20.mint(job);
    queues.transactions.queue.add({ transactionHash });
    return Promise.resolve(transactionHash);
});

queues.erc20.approve = QueueFactory('approveErc20', async (job) => {
    const transactionHash = await erc20.approve(job);
    queues.transactions.queue.add({ transactionHash });
    return Promise.resolve(transactionHash);
});

module.exports = queues;
