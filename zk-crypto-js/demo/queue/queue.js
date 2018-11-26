const QueueFactory = require('./factory');

const aztec = require('../deployer/aztec/jobs');

const queues = {};


queues.updateAztec = QueueFactory('updateAztec', aztec.updateAztec);

queues.deployAztec = QueueFactory('deployAztec', async (job) => {
    const transactionHash = await aztec.deployAztec(job);
    queues.updateAztec.queue.add({ transactionHash });
    return Promise.resolve(transactionHash);
});

module.exports = queues;
