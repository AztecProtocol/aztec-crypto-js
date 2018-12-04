global.Web3 = require('web3');

global.web3 = new global.Web3(new global.Web3.providers.WebsocketProvider('ws://localhost:8545')); // connection instance
