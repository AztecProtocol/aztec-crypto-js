const config = {
    TEST: {
        db: 'dbTest.json',
        provider: 'ws://localhost:9545',
        gasPrice: '10',
        redisConfig: {
            redis: {
                port: 6379,
                host: 'localhost',
            },
            queuePrefix: 'tests',
        },
    },
    DEVELOPMENT: {
        db: 'dbDevelopment.json',
        provider: 'ws://localhost:9545',
        gasPrice: '10',
        redisConfig: {
            redis: {
                port: 6379,
                host: 'localhost',
            },
            queuePrefix: 'development',
        },
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

module.exports = getConfig();
