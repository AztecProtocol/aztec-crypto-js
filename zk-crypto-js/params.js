const BN = require('bn.js');


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
params.H_X = new BN('6483851876951186340299698915131841524257417305942095255806178259056825531140', 10);
params.H_Y = new BN('5007075189070983654636859883510741442756570786515348039503723406517378975219', 10);
params.t2 = {
    x: {
        c0: new BN('210db872dec2e06c375dd40a5a354307bb4ba52ba65bd84594554580ae6f0639', 16),
        c1: new BN('153f806ab3b6b1514bdd6ed8b5815db000f9df529b09586b67994cb0f0640620', 16),
    },
    y: {
        c0: new BN('15ccfd881b5648efcdb7902ccabea48b076e026c9ce4bdc35e491edc7e47ae51', 16),
        c1: new BN('29874b8609546d9d502bf56d2a8e3b6dcb9aa3ae48d93c317834f66780539c6b', 16),
    }
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
};//     verifyingContract: '0x0000000000000000000000000000000000000000',

// 0x0000000000000000000000000000000000000000000000000000000000000060
// 0x0000000000000000000000000000000000000000000000000000000000000140
// 0x0000000000000000000000000000000000000000000000000000000000000000
// 0x0000000000000000000000000000000000000000000000000000000000000002
// 0x9635c0b00812ca5ac3c3e1a1e32931b025405a310decbf0ab767ea15f3b95a57
// 0x8c19a23bd14e1fba3d86513dd2aafe88bb51549755e11e543ae95a98fd0dc729
// 0x0000000000000000000000000c5e1c86eb4d04fd57ca62b500e6d430347338e8
// 0xaafa01ee93f1c5792ac1d17702d9c51371aa8ca976071c0037825274b9f15b84
// 0x1e1aa83207fa35abe461077b1551aca58e7346330fc2ccb48349303410e0f820
// 0x0000000000000000000000005c36628cb1f6022bcf07b506ddb9e4f821cadfac
// 0x0000000000000000000000000000000000000000000000000000000000000002
// 0xad78531a45dc28baf28cc8dccfffa54acb2f6f5bbdaa0ed2c352712b4dfe778e
// 0x25cd289c54b0f64fe281333ea3bdc9bc450af62c7895135bb84a2d1d9245fe4f
// 0x0000000000000000000000009f278297b55ff368a347a5e4d21a85b5970e84e7
// 0x2ac3a9e6cddfc37cbabdbb09cf8a9403415116c48caec1ba4ac77d9c5eaa4498
// 0x8715657297e84f51b63cc75fd65a8122090c41d19867513e3ac0bd64549d8574
// 0x0000000000000000000000002401fecb30a1cb359fe3e876ffb5943abb56a561

params.AZTEC_NOTE_SIGNATURE = {
    types: {
        AZTEC_NOTE_SIGNATURE: [
            { name: 'note', type: 'bytes32[4]' },
            { name: 'challenge', type: 'uint256' },
            { name: 'sender', type: 'address' },
        ],
        EIP712Domain: [
            { "name": "name", "type": "string" },
            { "name": "version", "type": "string" },
            { "name": "chainId", "type": "uint256" },
            { "name": "verifyingContract", "type": "address" },
            { "name": "salt", "type": "bytes32" },
        ],
    },
    primaryType: 'AZTEC_NOTE_SIGNATURE',
};

function bnToHex(bignum) {
    if (!BN.isBN(bignum)) {
        throw new Error(`expected ${bignum} to be of type BN`);
    }
    return `0x${toBytes32(bignum.toString(16))}`;
};

function toBytes32(input, padding = 'left')  { // assumes hex format
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
};
module.exports = params;