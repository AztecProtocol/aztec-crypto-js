const BN = require('bn.js');

const config = require('./config');
const db = require('./db/db');

const erc20Deploy = require('./deployer/erc20/erc20');
const aztecDeploy = require('./deployer/aztec/aztec');
const aztecTokenDeploy = require('./deployer/aztecToken/aztecToken');
const basicWallet = require('./basicWallet/basicWallet');

const scalingFactor = new BN('100000000000000000', 10);

async function demoDeploy(useDai = false, reset = false) {
    await basicWallet.init('0xa9b16b8C2399510706cD275aD9F86Ef668067351');
    await basicWallet.init('0x52c7e34f94412567A8d067261Ff715389ddF5Cb6');
    await basicWallet.init('0x35F4d8747FC8c44670b0Ff53affcf5e4cEFC62D8');

    if (reset) {
        await db.contracts.aztec.clear();
        await db.contracts.aztecToken.clear();
        await db.contracts.erc20.clear();
    }
    if (useDai) {
        db.contracts.erc20.create({
            contractAddress: '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359',
        });
    } else {
        console.log('deploying erc20 smart contract');
        const erc20TransactionHash = await erc20Deploy.deployErc20('0xa9b16b8C2399510706cD275aD9F86Ef668067351');
        console.log(`sent transaction ${erc20TransactionHash}, waiting for receipt`);
        await erc20Deploy.updateErc20(erc20TransactionHash);
    }
    const erc20Contract = db.contracts.erc20.get().latest;

    console.log('erc20 contract deployed to ', erc20Contract.contractAddress);

    const daiContract = db.contracts.erc20.get().latest;
    if (!daiContract || !daiContract.contractAddress) {
        throw new Error('could not find DAI contract');
    }
    console.log('deploying aztec smart contract');
    const aztecTransactionHash = await aztecDeploy.deployAztec('0xa9b16b8C2399510706cD275aD9F86Ef668067351');
    console.log(`sent transaction ${aztecTransactionHash}, waiting for receipt`);
    await aztecDeploy.updateAztec(aztecTransactionHash);

    const aztecContract = db.contracts.aztec.get().latest;
    console.log('aztec contract deployed to ', aztecContract.contractAddress);

    console.log('deploying aztec token smart contract');
    const aztecTokenTransactionHash = await aztecTokenDeploy.deployAztecToken(
        '0xa9b16b8C2399510706cD275aD9F86Ef668067351',
        aztecContract.contractAddress,
        erc20Contract.contractAddress,
        scalingFactor.toString(10)
    );

    console.log(`sent transaction at ${aztecTokenTransactionHash}, waiting for receipt`);

    await aztecTokenDeploy.updateAztecToken(aztecTokenTransactionHash);

    const aztecTokenContract = db.contracts.aztecToken.get().latest;
    console.log('aztec token contract deployed to ', aztecTokenContract.contractAddress);
    return true;
}

if (config.env === 'RINKEBY') {
    demoDeploy(false, true).then(() => {
        console.log('deployed');
    });
} else if (config.env === 'TEST') {
    demoDeploy(false, true).then(() => {
        console.log('deployed');
    });
} else if (config.env === 'MAINNET') {
    demoDeploy(true, false).then(() => {
        console.log('finished');
    });
}
