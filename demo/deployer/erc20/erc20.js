const deployer = require('../deployer');
const transactions = require('../transactions/transactions');

const db = require('../../db/db');

const ERC20Mintable = require('../../../build/contracts/ERC20Mintable.json');

const { web3 } = deployer;

const erc20 = {};

erc20.deployErc20 = async (address) => {
    const wallet = db.wallets.get(address);
    const erc20Db = db.contracts.erc20.get();
    const erc20Contract = new web3.eth.Contract(ERC20Mintable.abi, erc20Db.latest.contractAddress);

    if (erc20Db && erc20Db.latest.bytecode === ERC20Mintable.bytecode) {
        throw new Error('erc20 contract already deployed at address ', erc20Db.latest.address);
    }
    const transactionHash = await deployer.deployContract(erc20Contract, wallet, ERC20Mintable.bytecode);
    // add transaction
    db.transactions.create({
        status: 'SENT',
        type: 'CREATE_ERC20',
        transactionHash,
    });
    db.contracts.erc20.create({
        bytecode: ERC20Mintable.bytecode,
        contractAddress: '',
        transactionReceipt: {},
        transactionHash,
    });
    return transactionHash;
};

erc20.updateErc20 = async (transactionHash) => {
    const transactionReceipt = await transactions.getTransactionReceipt(transactionHash);
    return db.contracts.erc20.update(transactionHash, {
        bytecode: ERC20Mintable.bytecode,
        contractAddress: transactionReceipt.contractAddress,
        transactionReceipt,
        transactionHash,
    });
};

erc20.mint = async (from, to, value) => {
    const erc20Db = db.contracts.erc20.get();
    const fromWallet = db.wallets.get(from);
    if (!erc20Db.latest.contractAddress) {
        throw new Error('could not find deployed erc20 contract');
    }
    const erc20Contract = new web3.eth.Contract(ERC20Mintable.abi, erc20Db.latest.contractAddress);
    erc20Contract.contractAddress = erc20Db.latest.contractAddress;
    const transactionHash = await deployer.methodCall(
        erc20Contract,
        fromWallet,
        'mint',
        to,
        value
    );

    // add transaction
    db.transactions.create({
        status: 'SENT',
        type: 'ERC20_MINT',
        transactionHash,
    });
    return transactionHash;
};

erc20.approve = async (from, spender, value) => {
    const erc20Db = db.contracts.erc20.get();
    const fromWallet = db.wallets.get(from);
    if (!erc20Db.latest.contractAddress) {
        throw new Error('could not find deployed erc20 contract');
    }
    const erc20Contract = new web3.eth.Contract(ERC20Mintable.abi, erc20Db.latest.contractAddress);
    erc20Contract.contractAddress = erc20Db.latest.contractAddress;
    const transactionHash = await deployer.methodCall(
        erc20Contract,
        fromWallet,
        'approve',
        spender,
        value
    );

    // add transaction
    db.transactions.create({
        status: 'SENT',
        type: 'ERC20_APPROVE',
        transactionHash,
    });
    return transactionHash;
};

erc20.contract = (contractAddress) => {
    return new web3.eth.Contract(ERC20Mintable.abi, contractAddress);
};


module.exports = erc20;
