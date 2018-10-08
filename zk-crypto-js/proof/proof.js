const BN = require('bn.js');
const EC = require('elliptic');
const crypto = require('crypto');
const keccak256 = require('js-sha3').keccak256;
const utils = require('../utils/utils');
const { FIELD_MODULUS, GROUP_MODULUS, groupReduction } = require('../params');
const curve = require('../curve/curve');
const setup = require('../setup/setup');
const proof = {};

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

function hashStrings(inputArr) {
    if (!Array.isArray(inputArr)) {
        throw new Error(`expected ${inputArr} to be of type 'array'`);
    }
    const input = `${inputArr.map((i) => {
        const res = toBytes32(i);
        return res;
    }).join('')}`;
    return keccak256(input);
};

function Hash() {
    this.data = [];
};

Hash.prototype.append = function append(point) {
    this.data.push(toBytes32(point.x.fromRed().toString(16)));
    this.data.push(toBytes32(point.y.fromRed().toString(16)))
}

Hash.prototype.keccak = function keccak() {
    const result = hashStrings(this.data);
    this.data = [result];
}

Hash.prototype.toGroupScalar = function toGroupScalar() {
    return new BN(this.data[0], 16).toRed(groupReduction);
}

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


///@dev basic script to construct a join split transaction
proof.constructJoinSplit = ({ inputs, outputs }) => {
    const hashed = new Hash();
    hashed.data = [toBytes32('0')];
    hashed.keccak();
    // hash commitments
    inputs.forEach((input) => {
        hashed.append(input.gamma);
        hashed.append(input.sigma);
    });
    outputs.forEach((output) => {
        hashed.append(output.gamma);
        hashed.append(output.sigma);
    });
    const outputBlindingFactors = outputs.map((output) => {
        const bk = utils.randomGroupScalar();
        const ba = utils.randomGroupScalar();
        const x = hashed.toGroupScalar();

        const t1 = curve.h.mul(ba.redMul(x));
        const B = output.gamma.mul(bk.redMul(x)).add(curve.h.mul(ba.redMul(x)));
        // console.log('b x = ', B.x.fromRed().toString(16));
        hashed.append(B);
        hashed.keccak();
        return { bk, ba, B };
    });
    const inputBlindingFactors = inputs.map((input) => {
        const bk = utils.randomGroupScalar();
        const ba = utils.randomGroupScalar();
        const x = hashed.toGroupScalar();
        const B = input.gamma.mul(bk.redMul(x)).add(curve.h.mul(ba.redMul(x)));
        hashed.append(B);
        hashed.keccak();
        return { bk, ba, B };
    });
    hashed.keccak();
    const challenge = hashed.toGroupScalar();

    const finalInput = inputBlindingFactors.map((blindingFactor, i) => {
        const kBar = (inputs[i].k.redMul(challenge)).redAdd(blindingFactor.bk);
        const aBar = (inputs[i].a.redMul(challenge)).redAdd(blindingFactor.ba);
        return {
            gamma: inputs[i].gamma,
            sigma: inputs[i].sigma,
            kBar,
            aBar
        };
    });

    const finalOutput = outputBlindingFactors.map((blindingFactor, i) => {
        const kBar = (outputs[i].k.redMul(challenge)).redAdd(blindingFactor.bk);
        const aBar = (outputs[i].a.redMul(challenge)).redAdd(blindingFactor.ba);
        return {
            gamma: outputs[i].gamma,
            sigma: outputs[i].sigma,
            kBar,
            aBar,
            challenge,
        };
    });
    return { inputs: finalInput, outputs: finalOutput };
};

proof.formatABI = ({ gamma, sigma, kBar, aBar }) => {
    return [
        gamma.x.fromRed().toString(16),
        gamma.y.fromRed().toString(16),
        sigma.x.fromRed().toString(16),
        sigma.y.fromRed().toString(16),
        kBar.fromRed().toString(16),
        aBar.fromRed().toString(16),
    ];
};

module.exports = proof;