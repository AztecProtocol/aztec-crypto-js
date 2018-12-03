function generateErc20(database) {
    const erc20 = {};

    erc20.get = () => {
        const contract = database().get('contracts.erc20').value();
        return contract;
    };

    erc20.create = (data) => {
        const contract = database().get('contracts.erc20').value();
        const newContract = {
            latest: data,
            deployed: [...contract.deployed, data],
        };
        database().get('contracts.erc20').assign(newContract).write();
        return newContract;
    };

    erc20.update = (transactionHash, data) => {
        const contract = database().get('contracts.erc20').value();
        if (contract.latest.transactionHash !== transactionHash) {
            throw new Error(`erc20 transaction hash mismatch ${transactionHash}, ${JSON.stringify(contract.latest)}`);
        }
        const newContract = {
            latest: {
                ...contract.latest,
                ...data,
            },
            deployed: contract.deployed,
        };
        database().get('contracts.erc20').assign(newContract).write();
        return newContract;
    };

    // TODO export defaults
    erc20.clear = () => {
        database().get('contracts.erc20').assign({
            latest: {
                address: '',
                transactionHash: '',
                bytecode: '',
            },
            deployed: [],
        }).write();
    };
    return erc20;
}

module.exports = generateErc20;
