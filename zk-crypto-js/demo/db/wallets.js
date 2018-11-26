const initWallet = {
    publicKey: '',
    privateKey: '',
    name: '',
};

function generateWallets(database) {
    const wallets = {};

    wallets.create = (data) => {
        const wallet = database().get('wallets').find({ name: data.name }).value();
        if (wallet) {
            throw new Error('wallet already exists');
        }
        database().get('wallets')
            .push({ ...initWallet, ...data })
            .write();
        return database().get('wallets')
            .find({ name: data.name })
            .value();
    };

    wallets.update = (name, data) => {
        const wallet = database().get('wallets')
            .find({ name })
            .assign(data)
            .write();
        return wallet;
    };

    wallets.get = (address) => {
        const wallet = database().get('wallets')
            .find({ address })
            .value();
        return wallet;
    };
    return wallets;
}

module.exports = generateWallets;
