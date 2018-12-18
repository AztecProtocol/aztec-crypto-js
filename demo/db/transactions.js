const initTransaction = {
    transactionHash: '',
    status: 'NULL',
    type: 'NULL',
};

function generateTransactions(database) {
    const transactions = {};
    transactions.create = (data) => {
        const transaction = database().get('transactions').find({ transactionHash: data.transactionHash }).value();
        if (transaction) { throw new Error('transaction ', data.transactionHash, ' already exists'); }
        database().get('transactions')
            .push({ ...initTransaction, ...data })
            .write();
        const result = database().get('transactions').find({ transactionHash: data.transactionHash }).value();
        return result;
    };

    transactions.update = (transactionHash, data) => {
        const transaction = database()
            .get('transactions')
            .find({ transactionHash })
            .assign(data)
            .write();
        return transaction;
    };

    transactions.get = (transactionHash) => {
        const transaction = database().get('transactions').find({ transactionHash }).value();
        return transaction;
    };

    return transactions;
}


module.exports = generateTransactions;
