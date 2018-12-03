function generateAztecToken(database) {
    const aztecToken = {};

    aztecToken.get = () => {
        const contract = database().get('contracts.aztecToken').value();
        return contract;
    };

    aztecToken.create = (data) => {
        const contract = database().get('contracts.aztecToken').value();
        const newContract = {
            latest: data,
            deployed: [...contract.deployed, data],
        };
        database().get('contracts.aztecToken').assign(newContract).write();
        return newContract;
    };

    aztecToken.update = (transactionHash, data) => {
        const contract = database().get('contracts.aztecToken').value();
        if (contract.latest.transactionHash !== transactionHash) {
            throw new Error(`aztecToken transaction hash mismatch ${transactionHash}, ${JSON.stringify(contract.latest)}`);
        }
        const newContract = {
            latest: {
                ...contract.latest,
                ...data,
            },
            deployed: contract.deployed,
        };
        database().get('contracts.aztecToken').assign(newContract).write();
        return newContract;
    };

    // TODO export defaults
    aztecToken.clear = () => {
        database().get('contracts.aztecToken').assign({
            latest: {
                address: '',
                transactionHash: '',
                bytecode: '',
            },
            deployed: [],
        }).write();
    };
    return aztecToken;
}

module.exports = generateAztecToken;
