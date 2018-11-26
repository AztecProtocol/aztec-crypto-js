const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const config = require('../config');

const transactions = require('./transactions');
const wallets = require('./wallets');
const contracts = require('./contracts');

const adapter = new FileSync(config.db);
const database = low(adapter);

function getDb() {
    return database;
}
// Set some defaults (required if your JSON file is empty)

function initialState() {
    return {
        wallets: [],
        transactions: [],
        contracts: {
            aztec: {
                latest: {
                    address: '',
                    transactionHash: '',
                    bytecode: '',
                },
                deployed: [],
            },
            erc20: {
                latest: {
                    address: '',
                    transactionHash: '',
                    bytecode: '',
                },
                deployed: [],
            },
        },
    };
}

database.defaults(initialState()).write();

function clear() {
    database.setState(initialState());
}

module.exports = {
    wallets: wallets(getDb),
    transactions: transactions(getDb),
    contracts: contracts(getDb),
    clear,
};
