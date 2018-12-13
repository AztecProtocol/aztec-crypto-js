const deployer = require('../deployer');

const db = require('../../db/db');

const AZTEC = require('../../../build/contracts/AZTEC.json');
const AZTECInterface = require('../../../build/contracts/AZTECInterface.json');

const { web3 } = deployer;
AZTEC.abi = AZTECInterface.abi; // hon hon hon

const aztec = {};

aztec.getContractAddress = async () => {
    const networkId = await deployer.getNetwork();
    if (!AZTEC.networks[networkId] || !AZTEC.networks[networkId].address) {
        throw new Error('AZTEC.sol not deployed to network ', networkId);
    }
    return AZTEC.networks[networkId].address;
};

aztec.joinSplit = async (address, proofData, m, challenge, t2) => {
    const wallet = db.wallets.get(address);

    const contractAddress = await aztec.getContractAddress();
    const aztecContract = new web3.eth.Contract(AZTEC.abi, contractAddress);
    aztecContract.contractAddress = contractAddress;

    const transactionHash = await deployer.methodCall(
        aztecContract,
        wallet,
        'validateJoinSplit',
        proofData,
        m,
        challenge,
        t2
    );

    // add transaction
    db.transactions.create({
        status: 'SENT',
        type: 'AZTEC_JOIN_SPLIT',
        transactionHash,
    });
    const transactionReceipt = await deployer.getTransactionReceipt(transactionHash);

    db.transactions.update(transactionHash, {
        status: 'SENT',
        type: 'AZTEC_JOIN_SPLIT',
        transactionHash,
        transactionReceipt,
    });
    return transactionHash;
};

module.exports = aztec;
