const erc20 = require('./erc20');

const jobs = {};

jobs.deployErc20 = async function deployErc20(job) {
    return Promise.resolve(await erc20.deployErc20(job.data.address));
};

jobs.updateErc20 = async function updateErc20(job) {
    return Promise.resolve(await erc20.updateErc20(job.data.transactionHash));
};

jobs.mint = async function mint(job) {
    return Promise.resolve(await erc20.mint(job.data.from, job.data.to, job.data.value));
};

jobs.approve = async function mint(job) {
    return Promise.resolve(await erc20.approve(job.data.from, job.data.spender, job.data.value));
};

module.exports = jobs;
