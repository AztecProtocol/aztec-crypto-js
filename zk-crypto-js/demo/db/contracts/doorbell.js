function generatedoorbell(database) {
    const doorbell = {};

    doorbell.get = () => {
        console.log(database().get('contracts').value());
        const contract = database().get('contracts.doorbell').value();
        return contract;
    };

    doorbell.create = (data) => {
        const contract = database().get('contracts.doorbell').value();
        const newContract = {
            latest: data,
            deployed: [...contract.deployed, data],
        };
        database().get('contracts.doorbell').assign(newContract).write();
        return newContract;
    };

    doorbell.update = (transactionHash, data) => {
        const contract = database().get('contracts.doorbell').value();
        if (contract.latest.transactionHash !== transactionHash) {
            throw new Error(`doorbell transaction hash mismatch ${transactionHash}, ${JSON.stringify(contract.latest)}`);
        }
        const newContract = {
            latest: {
                ...contract.latest,
                ...data,
            },
            deployed: contract.deployed,
        };
        database().get('contracts.doorbell').assign(newContract).write();
        return newContract;
    };

    doorbell.clear = () => {
        database().get('contracts.doorbell').assign({
            latest: {
                address: '',
                transactionHash: '',
                bytecode: '',
            },
            deployed: [],
        }).write();
    };
    return doorbell;
}

module.exports = generatedoorbell;
