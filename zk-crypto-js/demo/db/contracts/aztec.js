function generateAztec(database) {
    const aztec = {};

    aztec.get = () => {
        const contract = database().get('contracts.aztec').value();
        return contract;
    };

    aztec.create = (data) => {
        const contract = database().get('contracts.aztec').value();
        const newContract = {
            latest: data,
            deployed: [...contract.deployed, data],
        };
        database().get('contracts.aztec').assign(newContract).write();
        // console.log('new contract = ', JSON.stringify(newContract));
        return newContract;
    };

    aztec.update = (transactionHash, data) => {
        const contract = database().get('contracts.aztec').value();
        if (contract.latest.transactionHash !== transactionHash) {
            throw new Error(`aztec transaction hash mismatch ${transactionHash}, ${JSON.stringify(contract.latest)}`);
        }
        const newContract = {
            latest: {
                ...contract.latest,
                ...data,
            },
            deployed: contract.deployed,
        };
        database().get('contracts.aztec').assign(newContract).write();
        return newContract;
    };
    return aztec;
}

module.exports = generateAztec;
