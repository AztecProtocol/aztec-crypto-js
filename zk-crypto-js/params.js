const BN = require('bn.js');

function toBytes32(input, padding = 'left') { // assumes hex format
    let s = input;
    if (s.length > 64) {
        throw new Error(`string ${input} is more than 32 bytes long!`);
    }
    while (s.length < 64) {
        if (padding === 'left') { // left pad to hash a number. Right pad to hash a string
            s = `0${s}`;
        } else {
            s = `${s}0`;
        }
    }
    return s;
}

function bnToHex(bignum) {
    if (!BN.isBN(bignum)) {
        throw new Error(`expected ${bignum} to be of type BN`);
    }
    return `0x${toBytes32(bignum.toString(16))}`;
}

const params = {};

params.SIGNATURES_PER_FILE = 1024;
params.FIELD_MODULUS = new BN('21888242871839275222246405745257275088696311157297823662689037894645226208583', 10);
params.GROUP_MODULUS = new BN('21888242871839275222246405745257275088548364400416034343698204186575808495617', 10);
params.fieldReduction = BN.red(params.FIELD_MODULUS);
params.groupReduction = BN.red(params.GROUP_MODULUS);
params.weierstrassBRed = (new BN(3).toRed(params.fieldReduction));
params.zeroRed = (new BN(0).toRed(params.fieldReduction));
params.K_MAX = 1048576;
params.K_MIN = 1;

// alternate x, y
// hash 32 byte ascii 0x6A75737420726561642074686520696E737472756374696F6E73000000000000 'just read the instructions'
params.H_X = new BN('7673901602397024137095011250362199966051872585513276903826533215767972925880', 10);
params.H_Y = new BN('8489654445897228341090914135473290831551238522473825886865492707826370766375', 10);
params.t2 = {
    x: {
        c0: new BN('1cf7cc93bfbf7b2c5f04a3bc9cb8b72bbcf2defcabdceb09860c493bdf1588d', 16),
        c1: new BN('8d554bf59102bbb961ba81107ec71785ef9ce6638e5332b6c1a58b87447d181', 16),
    },
    y: {
        c0: new BN('204e5d81d86c561f9344ad5f122a625f259996b065b80cbbe74a9ad97b6d7cc2', 16),
        c1: new BN('2cb2a424885c9e412b94c40905b359e3043275cd29f5b557f008cd0a3e0c0dc', 16),
    },
};

params.t2Formatted = [
    bnToHex(params.t2.x.c0),
    bnToHex(params.t2.x.c1),
    bnToHex(params.t2.y.c0),
    bnToHex(params.t2.y.c1),
];

params.AZTEC_RINKEBY_DOMAIN_PARAMS = {
    name: 'AZTEC_RINKEBY_DOMAIN',
    version: '0.1.0',
    chainId: '4',
    salt: '0x210db872dec2e06c375dd40a5a354307bb4ba52ba65bd84594554580ae6f0639',
};

params.AZTEC_MAINNET_DOMAIN_PARAMS = {
    name: 'AZTEC_MAINNET_DOMAIN',
    version: '0.1.0',
    chainId: '1',
    salt: '0x210db872dec2e06c375dd40a5a354307bb4ba52ba65bd84594554580ae6f0639',
};

params.AZTEC_NOTE_SIGNATURE = {
    types: {
        AZTEC_NOTE_SIGNATURE: [
            { name: 'note', type: 'bytes32[4]' },
            { name: 'challenge', type: 'uint256' },
            { name: 'sender', type: 'address' },
        ],
        EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
            { name: 'salt', type: 'bytes32' },
        ],
    },
    primaryType: 'AZTEC_NOTE_SIGNATURE',
};

module.exports = params;
