const BN = require('bn.js');
const crypto = require('crypto');
const utils = require('../utils/utils');
const Hash = require('../utils/keccak');
const { groupReduction } = require('../params');
const bn128 = require('../bn128/bn128');
const setup = require('../setup/setup');

const proof = {};

proof.generateCommitment = async (k) => {
    const kBn = new BN(k).toRed(groupReduction);
    const { x, y } = await setup.readSignature(k);
    const mu = bn128.point(x, y);
    const a = new BN(crypto.randomBytes(32), 16).toRed(groupReduction);
    const gamma = mu.mul(a);
    const sigma = gamma.mul(kBn).add(bn128.h.mul(a));
    return {
        gamma,
        sigma,
        a,
        k: kBn,
    };
};

proof.constructCommitment = async (k, a) => {
    const kBn = new BN(k).toRed(groupReduction);
    const { x, y } = await setup.readSignature(k);
    const mu = bn128.point(x, y);
    const aBn = new BN(a.slice(2), 16).toRed(groupReduction);
    const gamma = mu.mul(aBn);
    const sigma = gamma.mul(kBn).add(bn128.h.mul(aBn));
    return {
        gamma,
        sigma,
        a: aBn,
        k: kBn,
    };
};

proof.constructCommitmentSet = async ({ kIn, kOut }) => {
    const inputs = await Promise.all(kIn.map(async (k) => {
        return proof.generateCommitment(k);
    }));
    const outputs = await Promise.all(kOut.map(async (k) => {
        return proof.generateCommitment(k);
    }));
    return { inputs, outputs };
};
proof.constructModifiedCommitmentSet = async ({ kIn, kOut }) => {
    const inputs = await Promise.all(kIn.map(async (k) => {
        return proof.generateCommitment(k);
    }));
    const outputs = await Promise.all(kOut.map(async (k) => {
        return proof.generateCommitment(k);
    }));
    const commitments = [...inputs, ...outputs];
    return { commitments, m: inputs.length };
};

proof.constructJoinSplit = (notes, m, kPublic = 0) => {
    const rollingHash = new Hash();
    let kPublicBn;
    if (BN.isBN(kPublic)) {
        kPublicBn = kPublic;
    } else {
        kPublicBn = new BN(kPublic);
    }
    notes.forEach((note) => {
        rollingHash.append(note.gamma);
        rollingHash.append(note.sigma);
    });

    const finalHash = new Hash();
    finalHash.appendBN(kPublicBn);
    finalHash.appendBN(new BN(m));
    finalHash.data = [...finalHash.data, ...rollingHash.data];
    rollingHash.keccak();
    let runningBk = new BN(0).toRed(groupReduction);
    const blindingFactors = notes.map((note, i) => {
        let bk = utils.randomGroupScalar();
        const ba = utils.randomGroupScalar();
        let B;
        let x = new BN(0).toRed(groupReduction);
        if (i === (notes.length - 1)) {
            if (i + 1 === m) {
                bk = new BN(0).toRed(groupReduction).redSub(runningBk);
            } else {
                bk = runningBk;
            }
        }
        if ((i + 1) > m) {
            x = rollingHash.toGroupScalar();
            const xbk = bk.redMul(x);
            const xba = ba.redMul(x);
            runningBk = runningBk.redSub(bk);
            rollingHash.keccak();
            B = note.gamma.mul(xbk).add(bn128.h.mul(xba));
        } else {
            runningBk = runningBk.redAdd(bk);
            B = note.gamma.mul(bk).add(bn128.h.mul(ba));
        }

        finalHash.append(B);
        return {
            bk,
            ba,
            B,
            x,
        };
    });
    finalHash.keccak();
    const challenge = finalHash.toGroupScalar();
    const proofData = blindingFactors.map((blindingFactor, i) => {
        let kBar = ((notes[i].k.redMul(challenge)).redAdd(blindingFactor.bk)).fromRed();
        const aBar = ((notes[i].a.redMul(challenge)).redAdd(blindingFactor.ba)).fromRed();
        if (i === (notes.length - 1)) {
            kBar = kPublicBn;
        }
        return [
            utils.bnToHex(kBar),
            utils.bnToHex(aBar),
            utils.bnToHex(notes[i].gamma.x.fromRed()),
            utils.bnToHex(notes[i].gamma.y.fromRed()),
            utils.bnToHex(notes[i].sigma.x.fromRed()),
            utils.bnToHex(notes[i].sigma.y.fromRed()),
        ];
    });
    return {
        proofData,
        challenge: utils.bnToHex(challenge),
    };
};

module.exports = proof;
