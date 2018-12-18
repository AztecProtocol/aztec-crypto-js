/* global artifacts web3 */
const ERC20Mintable = artifacts.require('./ERC20Mintable.sol');
const AZTEC = artifacts.require('./AZTEC.sol');
const AZTECERC20Bridge = artifacts.require('./AZTECERC20Bridge.sol');

const { t2, daiAddress, erc20ScalingFactor } = require('../aztec-crypto-js/params');

function getChainId() {
    return new Promise((resolve, reject) => {
        web3.version.getNetwork((err, chainId) => {
            if (err) {
                return reject(err);
            }
            return resolve(chainId);
        });
    });
}

module.exports = (deployer, network) => {
    // just a bytecode switcheroo, nothing to see here...
    AZTECERC20Bridge.bytecode = AZTECERC20Bridge.bytecode.replace('AZTECInterface', 'AZTEC');
    AZTECERC20Bridge.deployedBytecode = AZTECERC20Bridge.deployedBytecode.replace('AZTECInterface', 'AZTEC');

    let chainId;
    return getChainId()
        .then((id) => {
            chainId = id;
            return deployer.deploy(AZTEC);
        })
        .then(() => deployer.link(AZTEC, AZTECERC20Bridge))
        .then(() => {
            if (network === 'MainNet') {
                return Promise.resolve({ address: daiAddress });
            }
            return deployer.deploy(ERC20Mintable);
        })
        .then(({ address: erc20Address }) => {
            return deployer.deploy(AZTECERC20Bridge, t2, erc20Address, erc20ScalingFactor, chainId);
        });
};
