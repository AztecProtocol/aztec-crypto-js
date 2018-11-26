const aztec = require('./aztec');

const jobs = {};

jobs.deployAztec = async function deployAztec(job) {
    return Promise.resolve(await aztec.deployAztec(job.data.address));
};

jobs.updateAztec = async function updateAztec(job) {
    return Promise.resolve(await aztec.updateAztec(job.data.transactionHash));
};

module.exports = jobs;
