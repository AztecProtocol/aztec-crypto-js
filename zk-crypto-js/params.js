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

module.exports = params;