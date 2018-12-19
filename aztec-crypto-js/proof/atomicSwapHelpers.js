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

atomicSwapHelpers.getBlindingFactorsAndChallenge = async (noteArray, finalHash) => {
    const bkArray = [];
    const blindingFactors = noteArray.map((note, i) => {
        // Create the blinding scalars
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
        return [
            new BN(noteData[0].slice(2), 16).toRed(groupReduction),
            new BN(noteData[1].slice(2), 16).toRed(groupReduction),
            new BN(noteData[2].slice(2), 16).toRed(groupReduction),
            new BN(noteData[3].slice(2), 16).toRed(groupReduction),
            new BN(noteData[4].slice(2), 16).toRed(groupReduction),
            new BN(noteData[5].slice(2), 16).toRed(groupReduction),
        ];
    });
    return proofDataBn;
};


module.exports = atomicSwapHelpers;
