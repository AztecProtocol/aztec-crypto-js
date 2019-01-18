const WalletProvider = require('truffle-wallet-provider');
const Wallet = require('ethereumjs-wallet');
const Web3 = require('web3');

const web3 = new Web3();
const rinkebyPrivateKey = Buffer.from('a5c9dede5aba72f88f6abf01ea768d78ad7c3bcfbf29d60bd46a829690bf7791', 'hex');
const rinkebyWallet = Wallet.fromPrivateKey(rinkebyPrivateKey);
const rinkebyProvider = new WalletProvider(rinkebyWallet, 'https://rinkeby.infura.io/FPuvsFyuZmA7p9xKUc9Q');

// how should this work...
// Create a file 'privateKeys' with an array of keys. Use them here and in demoTransactions when requiring wallets.
// Reasonable? I think so...
// Separate out wallets and other db structures
module.exports = {
    // See <http://truffleframework.com/docs/advanced/configuration>
    // to customize your Truffle configuration!
    networks: {
        development: {
            host: '127.0.0.1',
            port: 9545, // use port 7545, ganache's rpc port
            network_id: '*', // Match any network id
        },
        rinkeby: {
            provider: rinkebyProvider,
            // You can get the current gasLimit by running
            // truffle deploy --network rinkeby
            // truffle(rinkeby)> web3.eth.getBlock("pending", (error, result) =>
            //   console.log(result.gasLimit))
            gas: 4600000,
            gasPrice: web3.utils.toWei('10', 'gwei'),
            network_id: '2',
        },
    },

    compilers: {
        solc: {
            version: '0.4.24',
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 200,
                },
            },
        },
    },
};
