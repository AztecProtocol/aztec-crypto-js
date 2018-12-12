const config = {
    TEST: {
        db: 'dbTest.json',
        provider: 'ws://localhost:8545',
        gasPrice: '10',
        env: 'TEST',
    },
    DEVELOPMENT: {
        db: 'dbDevelopment.json',
        provider: 'ws://localhost:8545',
        gasPrice: '10',
        env: 'DEVELOPMENT',
    },
    RINKEBY: {
        db: 'dbRinkeby.json',
        provider: 'wss://rinkeby.infura.io/ws/v3/ef95d642a1ab405aa9f71e5096294a92',
        gasPrice: '10',
        env: 'RINKEBY',
    },
    MAINNET: {
        db: 'dbMainNet.json',
        provider: 'wss://mainnet.infura.io/ws/v3/ef95d642a1ab405aa9f71e5096294a92',
        gasPrice: '5',
        env: 'MAINNET',
    },
    NONE: {
        env: 'NONE',
        db: 'none.json',
    },
};

function getConfig() {
    const nodeEnv = process.env.NODE_ENV;
    const params = config[nodeEnv];
    if (!params) {
        return config.TEST;
    }
    return params;
}

const exported = getConfig();
module.exports = exported;
