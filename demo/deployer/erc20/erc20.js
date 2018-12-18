const deployer = require('../deployer');

const db = require('../../db/db');

const ERC20Mintable = require('../../../build/contracts/ERC20Mintable.json');

const { web3 } = deployer;

const erc20 = {};

erc20.getContractAddress = async () => {
    const networkId = await deployer.getNetwork();
    if (!ERC20Mintable.networks[networkId] || !ERC20Mintable.networks[networkId].address) {
        throw new Error('ERC20Mintable.sol not deployed to network ', networkId);
    }
    return ERC20Mintable.networks[networkId].address;
};

erc20.mint = async (from, to, value) => {
    const contractAddress = await erc20.getContractAddress();

    const fromWallet = db.wallets.get(from);

    const erc20Contract = new web3.eth.Contract(ERC20Mintable.abi, contractAddress);
    erc20Contract.contractAddress = contractAddress;
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
    const contractAddress = await erc20.getContractAddress();

    const fromWallet = db.wallets.get(from);

    const erc20Contract = new web3.eth.Contract(ERC20Mintable.abi, contractAddress);
    erc20Contract.contractAddress = contractAddress;
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
