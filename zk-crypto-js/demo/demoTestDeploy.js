const config = require('./config');
const db = require('./db/db');

const doorbellDeploy = require('./deployer/doorbell/doorbell');
const basicWallet = require('./basicWallet/basicWallet');

async function demoDeploy(useDai = false, reset = false) {
    await basicWallet.init('0xbD05c992C1A36E83f578cC37d4748B860d4469CC');

    if (reset) {
        await db.contracts.aztec.clear();
        await db.contracts.aztecToken.clear();
        await db.contracts.erc20.clear();
        await db.contracts.doorbell.clear();
    }
    if (useDai) {
        db.contracts.erc20.create({
            contractAddress: '0xbD05c992C1A36E83f578cC37d4748B860d4469CC',
        });
    } else {
        console.log('deploying doorbell smart contract');
        const doorbellTransactionHash = await doorbellDeploy.deployDoorbell('0xbD05c992C1A36E83f578cC37d4748B860d4469CC');
        console.log(`sent transaction ${doorbellTransactionHash}, waiting for receipt`);
        await doorbellDeploy.updateDoorbell(doorbellTransactionHash);
    }
    const doorbellContract = db.contracts.doorbell.get().latest;

    console.log('doorbell contract deployed to ', doorbellContract.contractAddress);
}

if (config.env === 'RINKEBY') {
    demoDeploy(false, true).then(() => {
        console.log('deployed');
    });
} else if (config.env === 'MAINNET') {
    demoDeploy(true, false).then(() => {
        console.log('finished');
    });
} else if (config.env === 'TEST') {
    demoDeploy(false, true).then(() => {
        console.log('deployed');
    });
}
