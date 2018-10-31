const BN = require('bn.js');
const EC = require('elliptic');
const crypto = require('crypto');
const Web3 = require('web3');
const utils = require('../utils/utils');
const Hash = require('../utils/keccak');
const { FIELD_MODULUS, GROUP_MODULUS, groupReduction } = require('../params');
const curve = require('../curve/curve');
const setup = require('../setup/setup');
const proof = {};

const web3 = new Web3();


proof.generateCommitment = async (k) => {
    const kBn = new BN(k).toRed(groupReduction);
    const { x, y } = await setup.readSignature(k);
    const mu = curve.point(x, y);
    let a = new BN(crypto.randomBytes(32), 16).toRed(groupReduction);
    const gamma = mu.mul(a);
    const sigma = gamma.mul(kBn).add(curve.h.mul(a));
    return { gamma, sigma, a, k: kBn };
};


proof.constructCommitmentSet = async ({ kIn, kOut }) => {
    const inputs = await Promise.all(kIn.map(async (k) => {
        return await proof.generateCommitment(k);
    }));
    const outputs = await Promise.all(kOut.map(async (k) => {
        return await proof.generateCommitment(k);
    }));
    return { inputs, outputs };
};

proof.constructCommit = ({ outputs, k }) => {
    const hashed = new Hash();
    hashed.data = [utils.toBytes32('0')];
    outputs.forEach((output) => {
        hashed.append(output.gamma);
        hashed.append(output.sigma);
        hashed.keccak();
    });

    let bkScalar = new BN(0).toRed(groupReduction);
    const outputBlindingFactors = outputs.map((output) => {
        const bk = utils.randomGroupScalar();
        const ba = utils.randomGroupScalar();
        const x = hashed.toGroupScalar();

        const t1 = curve.h.mul(ba.redMul(x));
        const B = output.gamma.mul(bk.redMul(x)).add(curve.h.mul(ba.redMul(x)));
        bkScalar = bkScalar.redAdd(bk);
        hashed.append(B);
        hashed.keccak();
        return { bk, ba, B };
    });

    const BSum = curve.g.mul(bkScalar);

    hashed.append(BSum);
    hashed.keccak();
    const challenge = hashed.toGroupScalar();

    const proofOutputs = outputBlindingFactors.map((blindingFactor, i) => {
        const kBar = (outputs[i].k.redMul(challenge)).redAdd(blindingFactor.bk);
        const aBar = (outputs[i].a.redMul(challenge)).redAdd(blindingFactor.ba);
        return [
            utils.bnToHex(kBar.fromRed()),               // kBar
            utils.bnToHex(aBar.fromRed()),               // aBar
            utils.bnToHex(outputs[i].gamma.x.fromRed()), // gammaX
            utils.bnToHex(outputs[i].gamma.y.fromRed()), // gammaY
            utils.bnToHex(outputs[i].sigma.x.fromRed()), // sigmaX
            utils.bnToHex(outputs[i].sigma.y.fromRed()), // sigmaY
        ];
    });

    const noteOutputs = proofOutputs.map(p => [p[2], p[3], p[4], p[5]]);

    return {
        proofOutputs,
        noteOutputs,
        challenge: utils.bnToHex(challenge),
    };
};

proof.constructReveal = ({ inputs, k }) => {
    const { proofOutputs, noteOutputs, challenge } = proof.constructCommit({ outputs: inputs, k });
    return { proofInputs: proofOutputs, noteInputs: noteOutputs, challenge };
};

///@dev basic script to construct a join split transaction
proof.constructJoinSplit = ({ inputs, outputs }) => {
    const hashed = new Hash();
    hashed.data = [utils.toBytes32('0')];
    // hash commitments
    inputs.forEach((input) => {
        hashed.append(input.gamma);
        hashed.append(input.sigma);
        hashed.keccak();
    });
    outputs.forEach((output) => {
        hashed.append(output.gamma);
        hashed.append(output.sigma);
        hashed.keccak();
    });

    let bkScalar = new BN(0).toRed(groupReduction);
    const outputBlindingFactors = outputs.map((output) => {
        const bk = utils.randomGroupScalar();
        const ba = utils.randomGroupScalar();
        const x = hashed.toGroupScalar();

        const t1 = curve.h.mul(ba.redMul(x));
        const B = output.gamma.mul(bk.redMul(x)).add(curve.h.mul(ba.redMul(x)));
        bkScalar = bkScalar.redAdd(bk);
        hashed.append(B);
        hashed.keccak();
        return { bk, ba, B };
    });
    const inputBlindingFactors = inputs.map((input) => {
        const bk = utils.randomGroupScalar();
        const ba = utils.randomGroupScalar();
        const x = hashed.toGroupScalar();
        const B = input.gamma.mul(bk.redMul(x)).add(curve.h.mul(ba.redMul(x)));

        bkScalar = bkScalar.redSub(bk);
        hashed.append(B);
        hashed.keccak();
        return { bk, ba, B };
    });

    const BSum = curve.g.mul(bkScalar);

    hashed.append(BSum);
    hashed.keccak();
    const challenge = hashed.toGroupScalar();

    const proofInputs = inputBlindingFactors.map((blindingFactor, i) => {
        const kBar = (inputs[i].k.redMul(challenge)).redAdd(blindingFactor.bk);
        const aBar = (inputs[i].a.redMul(challenge)).redAdd(blindingFactor.ba);
        return [
            utils.bnToHex(kBar.fromRed()),              // kBar
            utils.bnToHex(aBar.fromRed()),              // aBar
            utils.bnToHex(inputs[i].gamma.x.fromRed()), // gammaX
            utils.bnToHex(inputs[i].gamma.y.fromRed()), // gammaY
            utils.bnToHex(inputs[i].sigma.x.fromRed()), // sigmaX
            utils.bnToHex(inputs[i].sigma.y.fromRed()), // sigmaY
        ];
    });

    const proofOutputs = outputBlindingFactors.map((blindingFactor, i) => {
        const kBar = (outputs[i].k.redMul(challenge)).redAdd(blindingFactor.bk);
        const aBar = (outputs[i].a.redMul(challenge)).redAdd(blindingFactor.ba);
        return [
            utils.bnToHex(kBar.fromRed()),               // kBar
            utils.bnToHex(aBar.fromRed()),               // aBar
            utils.bnToHex(outputs[i].gamma.x.fromRed()), // gammaX
            utils.bnToHex(outputs[i].gamma.y.fromRed()), // gammaY
            utils.bnToHex(outputs[i].sigma.x.fromRed()), // sigmaX
            utils.bnToHex(outputs[i].sigma.y.fromRed()), // sigmaY
        ];
    });

    const noteInputs = proofInputs.map(p => [p[2], p[3], p[4], p[5]]);
    const noteOutputs = proofOutputs.map(p => [p[2], p[3], p[4], p[5]]);

    return {
        proofInputs,
        proofOutputs,
        noteInputs,
        noteOutputs,
        challenge: utils.bnToHex(challenge),
    };
};

module.exports = proof;