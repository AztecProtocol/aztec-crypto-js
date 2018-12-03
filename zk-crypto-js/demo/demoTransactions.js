const BN = require('bn.js');

const config = require('./config');
const db = require('./db/db');

const erc20Deploy = require('./deployer/erc20/erc20');
const aztecTokenDeploy = require('./deployer/aztecToken/aztecToken');
const transactions = require('./deployer/transactions/transactions');
const basicWallet = require('./basicWallet/basicWallet');
const noteController = require('./note/controller');

const scalingFactor = new BN('100000000000000000', 10);

async function demoTransactions(mint = false) {
    const accounts = [
        '0xa9b16b8C2399510706cD275aD9F86Ef668067351',
        '0x52c7e34f94412567A8d067261Ff715389ddF5Cb6',
        '0x35F4d8747FC8c44670b0Ff53affcf5e4cEFC62D8',
    ];
    await basicWallet.init(accounts[0]);
    await basicWallet.init(accounts[1]);
    await basicWallet.init(accounts[2]);
    const aztecTokenContract = db.contracts.aztecToken.get().latest;

    // approve aztecToken for scalingFactor.mul(500) tokens from account 0
    // create 4 notes split between accounts 0, 1 and 2
    // split 1st and 3rd note
    // split 2nd and 4th note
    if (mint) {
        console.log('minting 500 tokens');
        await transactions.getTransactionReceipt(
            await erc20Deploy.mint(
                accounts[0],
                accounts[0],
                scalingFactor.mul(new BN(500)).toString(10)
            )
        );
        console.log('minted');
    }

    console.log('approving aztecToken for 500 tokens');
    await transactions.getTransactionReceipt(
        await erc20Deploy.approve(
            accounts[0],
            aztecTokenContract.contractAddress,
            scalingFactor.mul(new BN(500)).toString(10)
        )
    );
    const proofs = [];
    const transactionHashes = [];
    console.log('issuing first join-split transaction');

    proofs[0] = noteController.createConfidentialTransfer(
        [],
        [[accounts[0], 107], [accounts[0], 83], [accounts[1], 204], [accounts[2], 106]],
        -500,
        accounts[0]
    );
    transactionHashes[0] = await aztecTokenDeploy.confidentialTransfer(
        accounts[0],
        proofs[0].proofData,
        proofs[0].m,
        proofs[0].challenge,
        proofs[0].inputSignatures,
        proofs[0].outputOwners,
        proofs[0].metadata
    );
    console.log('dispatched 1st join-split, waiting for receipt');

    await aztecTokenDeploy.updateJoinSplitTransaction(transactionHashes[0]);

    console.log('first join-split transaction mined, issuing second join-split transaction');

    proofs[1] = noteController.createConfidentialTransfer(
        [proofs[0].noteHashes[0], proofs[0].noteHashes[2]],
        [[accounts[0], 140], [accounts[2], 171]],
        0,
        accounts[0]
    );
    transactionHashes[1] = await aztecTokenDeploy.confidentialTransfer(
        accounts[0],
        proofs[1].proofData,
        proofs[1].m,
        proofs[1].challenge,
        proofs[1].inputSignatures,
        proofs[1].outputOwners,
        proofs[1].metadata
    );

    console.log('dispatched 2nd join-split, waiting for receipt');

    await aztecTokenDeploy.updateJoinSplitTransaction(transactionHashes[1]);

    console.log('second join-split transaction mined, issuing third join-split transaction');

    proofs[2] = noteController.createConfidentialTransfer(
        [proofs[0].noteHashes[1], proofs[0].noteHashes[3]],
        [[accounts[0], 50], [accounts[2], 50]],
        89,
        accounts[1]
    );
    transactionHashes[2] = await aztecTokenDeploy.confidentialTransfer(
        accounts[1],
        proofs[2].proofData,
        proofs[2].m,
        proofs[2].challenge,
        proofs[2].inputSignatures,
        proofs[2].outputOwners,
        proofs[2].metadata
    );

    console.log('dispatched 3rd join-split, waiting for receipt');
    await aztecTokenDeploy.updateJoinSplitTransaction(transactionHashes[2]);

    console.log('third join-split transaction mined');
}

if (config.env === 'RINKEBY') {
    demoTransactions(true).then(() => {
        console.log('finished');
    });
} else if (config.env === 'MAINNET') {
    demoTransactions(false).then(() => {
        console.log('finished');
    });
}
