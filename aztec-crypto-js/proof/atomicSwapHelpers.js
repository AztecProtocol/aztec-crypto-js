const BN = require('bn.js');

const bn128 = require('../bn128/bn128');

const { groupReduction } = bn128;


const atomicSwapHelpers = {};

atomicSwapHelpers.checkNumberNotes = async (notes) => {
    const numMakerNotes = Object.keys(notes.makerNotes).length;
    const numTakerNotes = Object.keys(notes.takerNotes).length;
    const numNotes = numMakerNotes + numTakerNotes;

    if (numNotes !== 4) {
        Error('Incorrect number of notes');
    } else {
        return numNotes;
    }
};

atomicSwapHelpers.makeNoteArray = async (notes) => {
    const makerNotes = Object.values(notes.makerNotes);
    const takerNotes = Object.values(notes.takerNotes);
    const noteArray = [makerNotes[0], makerNotes[1], takerNotes[0], takerNotes[1]];
    return noteArray;
};

atomicSwapHelpers.validateOnCurve = (x, y) => {
    const rhs = x.redSqr().redMul(x).redAdd(bn128.b);
    const lhs = y.redSqr();
    if (!rhs.fromRed().eq(lhs.fromRed())) {
        throw new Error('no! bad!');
    }
};

atomicSwapHelpers.getBlindingFactorsAndChallenge = async (noteArray, finalHash) => {
    const bkArray = [];
    const blindingFactors = noteArray.map((note, i) => {
        let bk = bn128.randomGroupScalar();
        const ba = bn128.randomGroupScalar();
        let B;

        // Maker notes
        if (i <= 1) { // i (index) === 1 is the half way point - the boundary between maker and taker notes
            B = note.gamma.mul(bk).add(bn128.h.mul(ba));
        } else { // taker notes
            bk = bkArray[i-2];
            B = note.gamma.mul(bk).add(bn128.h.mul(ba));
        }
        console.log('constructed B = ', B.x.fromRed().toString(16));
        finalHash.append(B);
        bkArray.push(bk);

        return {
            bk,
            ba,
            B,
        };
    });

    finalHash.keccak();
    const challenge = finalHash.toGroupScalar(groupReduction);
    return { blindingFactors, challenge };
};

atomicSwapHelpers.convertToBn = async (proofData) => {
    const proofDataBn = proofData.map((noteData) => {
        // Reconstruct gamma
        const xGamma = new BN(noteData[2].slice(2), 16).toRed(bn128.red);
        const yGamma = new BN(noteData[3].slice(2), 16).toRed(bn128.red);
        const gamma = bn128.point(xGamma, yGamma);

        // Reconstruct sigma
        const xSigma = new BN(noteData[4].slice(2), 16).toRed(bn128.red);
        const ySigma = new BN(noteData[5].slice(2), 16).toRed(bn128.red);
        const sigma = bn128.point(xSigma, ySigma);

        return [
            new BN(noteData[0].slice(2), 16).toRed(groupReduction), // kbar
            new BN(noteData[1].slice(2), 16).toRed(groupReduction), // aBar
            xGamma,
            yGamma,
            xSigma,
            ySigma,
            gamma,
            sigma,
        ];
    });

    return proofDataBn;
};

atomicSwapHelpers.recoverBlindingFactorsAndChallenge = async (proofDataBn, formattedChallenge, finalHash) => {
    const kBarArray = [];
    const recoveredBlindingFactors = proofDataBn.map((proofElement, i) => {
        let kBar = proofElement[0];
        const aBar = proofElement[1];
        const gamma = proofElement[6];
        const sigma = proofElement[7];
        let B;

        // Maker notes
        if (i <= 1) {
            B = gamma.mul(kBar).add(bn128.h.mul(aBar)).add(sigma.mul(formattedChallenge).neg());
        } else { // taker notes
            kBar = kBarArray[i-2];
            B = gamma.mul(kBar).add(bn128.h.mul(aBar)).add(sigma.mul(formattedChallenge).neg());
        }
        console.log('recovered blinding factor = ', B.x.fromRed().toString(16));
        finalHash.append(B);
        kBarArray.push(kBar);

        return {
            kBar,
            B,
        };
    });
    finalHash.keccak();
    const recoveredChallenge = finalHash.toGroupScalar(groupReduction);
    return { recoveredBlindingFactors, recoveredChallenge };
};


module.exports = atomicSwapHelpers;
