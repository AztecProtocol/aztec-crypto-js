const Web3 = require('web3');

const config = require('./config');


const web3 = new Web3(config.provider);

const listen = () => {
    const provider = new Web3.providers.WebsocketProvider(config.provider);
    provider.on('connect', () => {
        console.log('web3 connected');
    });
    provider.on('error', (e) => {
        console.error('WS Error', e);
        listen();
    });
    provider.on('end', (e) => {
        console.log('WS Closed', e);
        listen();
    });
    web3.setProvider(provider);
};
listen();


module.exports = web3;
