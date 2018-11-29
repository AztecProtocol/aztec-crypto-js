const config = {
    TEST: {
        db: 'dbTest.json',
        provider: 'ws://localhost:8545',
        gasPrice: '10',
        redisConfig: {
            redis: {
                port: 6379,
                host: 'localhost',
            },
            queuePrefix: 'tests',
        },
        env: 'TEST',
    },
    DEVELOPMENT: {
        db: 'dbDevelopment.json',
        provider: 'ws://localhost:8545',
        gasPrice: '10',
        redisConfig: {
            redis: {
                port: 6379,
                host: 'localhost',
            },
            queuePrefix: 'development',
        },
        env: 'DEVELOPMENT',
    },
    RINKEBY: {
        db: 'dbRinkeby.json',
        provider: 'wss://rinkeby.infura.io/ws',
        gasPrice: '10',
        redisConfig: {
            redis: {
                port: 6379,
                host: 'localhost',
            },
            queuePrefix: 'rinkeby',
        },
        env: 'RINKEBY',
    },
    MAINNET: {
        db: 'dbMainNet.json',
        provider: 'wss://mainnet.infura.io/ws',
        gasPrice: '10',
        redisConfig: {
            redis: {
                port: 6379,
                host: 'localhost',
            },
            queuePrefix: 'mainnet',
        },
        env: 'MAINNET',
    },
};

function getConfig() {
    const nodeEnv = process.env.NODE_ENV;
    const params = config[nodeEnv];
    if (!params) {
        return config.default;
    }
    return params;
}

const exported = getConfig();
module.exports = exported;
