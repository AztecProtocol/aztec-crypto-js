const BN = require('bn.js');
const EC = require('elliptic');
const crypto = require('crypto');
const Web3 = require('web3');
const utils = require('../utils/utils');
const Hash = require('../utils/keccak');
const { FIELD_MODULUS, GROUP_MODULUS, groupReduction, fieldReduction } = require('../params');
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
proof.constructModifiedCommitmentSet = async ({ kIn, kOut }) => {
    const inputs = await Promise.all(kIn.map(async (k) => {
        return await proof.generateCommitment(k);
    }));
    const outputs = await Promise.all(kOut.map(async (k) => {
        return await proof.generateCommitment(k);
    }));
    const commitments = [...inputs, ...outputs];
    return { commitments, m: inputs.length - 1 };
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

proof.constructModifiedJoinSplit = (notes, m, kPublic = 0) => {
    const rollingHash = new Hash();
    notes.forEach((note) => {
        rollingHash.append(note.gamma);
        rollingHash.append(note.sigma);
    });

    const finalHash = new Hash();
    finalHash.data = [...rollingHash.data];
    console.log('rolling hash data= ', rollingHash.data.map(r => utils.toBytes32(r)));
    rollingHash.keccak();
    console.log(rollingHash.toGroupScalar());
    console.log('initial commitment hash = ', rollingHash.data[0]);
    console.log('kPublic = ', kPublic);
    let runningBk = new BN(0).toRed(groupReduction);
    const blindingFactors = notes.map((note, i) => {
        let bk = utils.randomGroupScalar();
        let ba = utils.randomGroupScalar();
        let B;
        let x = new BN(0).toRed(groupReduction);
        if (i === (notes.length - 1)) {
            bk = runningBk.redAdd(new BN(kPublic).toRed(groupReduction));
            console.log('setting final bk to ', bk);
        }
        if (i > m) {
            x = rollingHash.toGroupScalar();
            const xbk = bk.redMul(x);
            const xba = ba.redMul(x);
            runningBk = runningBk.redSub(bk);
            rollingHash.keccak();
            B = note.gamma.mul(xbk).add(curve.h.mul(xba));
        } else {
            runningBk = runningBk.redAdd(bk);
            B = note.gamma.mul(bk).add(curve.h.mul(ba));
        }
        console.log('blinding factor = ', B);

        finalHash.append(B);
        return { bk, ba, B, x };
    });
    finalHash.keccak();
    const challenge = finalHash.toGroupScalar();
    let kFinal;
    const proofData = blindingFactors.map((blindingFactor, i) => {
        console.log('note = ', notes[i]);
        let kBar = ((notes[i].k.redMul(challenge)).redAdd(blindingFactor.bk)).fromRed();
        const aBar = ((notes[i].a.redMul(challenge)).redAdd(blindingFactor.ba)).fromRed();
        if (i === (notes.length - 1)) {
            kFinal = kBar;
            kBar = new BN(kPublic);
        }
        // console.log('kbar x = ', kBar.mul(blindingFactor.x.fromRed()).umod(GROUP_MODULUS));
        // console.log('abar x = ', aBar.mul(blindingFactor.x.fromRed()).umod(GROUP_MODULUS));
        // console.log('c x = ', challenge.redMul(blindingFactor.x).fromRed());
        // const a = notes[i].gamma.mul(kBar.mul(blindingFactor.x.fromRed()).umod(GROUP_MODULUS));
        // const b = curve.h.mul(aBar.mul(blindingFactor.x.fromRed()).umod(GROUP_MODULUS));
        // const sig = notes[i].sigma.neg();
        // const c = sig.mul((challenge.redMul(blindingFactor.x).fromRed()));
        // const r = a.add(b).add(c);

        // console.log('blinding factor test = ', r);
        // const comparison = notes[i].gamma.mul(blindingFactor.bk).add(curve.h.mul(blindingFactor.ba));

        // let kBarX = kBar.mul(blindingFactor.x.fromRed()).toRed(groupReduction);
        // let kcx = notes[i].k.redMul(challenge).redMul(blindingFactor.x);
        // const testBk = kBarX.redSub(kcx);
        // console.log('bk = ', blindingFactor.bk.fromRed());
        // console.log('test bk = ', testBk.fromRed());
        // console.log('comparison = ', comparison);
        // console.log(testBk.eq(blindingFactor.bk));
        return [
            utils.bnToHex(kBar),               // kBar
            utils.bnToHex(aBar),               // aBar
            utils.bnToHex(notes[i].gamma.x.fromRed()), // gammaX
            utils.bnToHex(notes[i].gamma.y.fromRed()), // gammaY
            utils.bnToHex(notes[i].sigma.x.fromRed()), // sigmaX
            utils.bnToHex(notes[i].sigma.y.fromRed()), // sigmaY
        ];
    });

    let kTest = new BN(0);
    for (let i = 0; i < 3; i += 1) {
        kTest = kTest.add(new BN(proofData[i][0].slice(2), 16)).umod(GROUP_MODULUS);
    }
    for (let i = 3; i < 4; i += 1) {
        kTest = kTest.sub(new BN(proofData[i][0].slice(2), 16)).umod(GROUP_MODULUS);
    }
    console.log('kTest = ', kTest);
    console.log('kFinal = ', kFinal);
    console.log(kTest.eq(kFinal));
    console.log('challenge = ', challenge);
    return {
        proofData,
        challenge: utils.bnToHex(challenge),
    };
};

///@dev basic script to construct a join split transaction
proof.constructJoinSplit = ({ inputs, outputs }, kPublic = 0) => {
    const hashed = new Hash();
   //  hashed.data = [utils.toBytes32('0')];
    // hash commitments
    inputs.forEach((input) => {
        hashed.append(input.gamma);
        hashed.append(input.sigma);
    });
    outputs.forEach((output) => {
        hashed.append(output.gamma);
        hashed.append(output.sigma);
    });
    hashed.keccak();
    const finalHash = new Hash();
    //  hashed.data = [utils.toBytes32('0')];
     // hash commitments
     inputs.forEach((input) => {
        finalHash.append(input.gamma);
        finalHash.append(input.sigma);
     });
     outputs.forEach((output) => {
        finalHash.append(output.gamma);
        finalHash.append(output.sigma);
     });
    let bkScalar = new BN(0).toRed(groupReduction);
    let runningBk = new BN(0).toRed(groupReduction);
    const outputBlindingFactors = outputs.map((output) => {
        const bk = utils.randomGroupScalar();
        const ba = utils.randomGroupScalar();
        const x = hashed.toGroupScalar();
        console.log('x = ', x);
        const t1 = curve.h.mul(ba.redMul(x));
        const B = output.gamma.mul(bk.redMul(x)).add(curve.h.mul(ba.redMul(x)));
        finalHash.append(B);
        hashed.keccak();
        runningBk = runningBk.redAdd(bk);
        console.log('running bk = ', runningBk);
        return { bk, ba, B };
    });
    console.log('inputs = ', inputs);
    const inputBlindingFactors = inputs.slice(0, -1).map((input) => {
        const bk = utils.randomGroupScalar();
        const ba = utils.randomGroupScalar();
       // const x = hashed.toGroupScalar();
        const B = input.gamma.mul(bk).add(curve.h.mul(ba));
        runningBk = runningBk.redSub(bk);
        finalHash.append(B);
       // hashed.keccak();
        return { bk, ba, B };
    });
    const finalBlindingFactor = (input) => {
        const ba = utils.randomGroupScalar();
        // const x = hashed.toGroupScalar();
       //  console.log('final x = ', x);

        const B = input.gamma.mul(runningBk).add(curve.h.mul(ba));
        finalHash.append(B);
        // hashed.append(B);
        // hashed.keccak();
        return { bk: runningBk, ba, B };
    };
    inputBlindingFactors.push(finalBlindingFactor(inputs[inputs.length - 1]));
    finalHash.keccak();
    console.log('input blinding factors = ', inputBlindingFactors);
    // const challengeString = hashed.toBytes32();
    const challenge = finalHash.toGroupScalar();
    console.log('x = ', challenge);
    let kTest = new BN(0).toRed(groupReduction);
    let kExpected = new BN(0).toRed(groupReduction); 
    const proofInputs = inputBlindingFactors.map((blindingFactor, i) => {
        const kBar = (inputs[i].k.redMul(challenge)).redAdd(blindingFactor.bk);
        const aBar = (inputs[i].a.redMul(challenge)).redAdd(blindingFactor.ba);
        if (i < inputBlindingFactors.length - 1) {
            kTest = kTest.redSub(kBar);
        } else {
            kExpected = kBar;
        }
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
        kTest = kTest.redAdd(kBar);

        return [
            utils.bnToHex(kBar.fromRed()),               // kBar
            utils.bnToHex(aBar.fromRed()),               // aBar
            utils.bnToHex(outputs[i].gamma.x.fromRed()), // gammaX
            utils.bnToHex(outputs[i].gamma.y.fromRed()), // gammaY
            utils.bnToHex(outputs[i].sigma.x.fromRed()), // sigmaX
            utils.bnToHex(outputs[i].sigma.y.fromRed()), // sigmaY
        ];
    });


    console.log('ktest = ', kTest);
    console.log('kExpected = ', kExpected);
    if (!kTest.eq(kExpected)) {
        throw new Error('hey!');
    }
    console.log('challenge = ', challenge);
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