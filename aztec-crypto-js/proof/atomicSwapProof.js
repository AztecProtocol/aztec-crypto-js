const BN = require('bn.js');
const crypto = require('crypto');
const { padLeft } = require('web3-utils');

const Hash = require('../utils/keccak');
const bn128 = require('../bn128/bn128');
const setup = require('../setup/setup');

const { groupReduction } = bn128;

/**
 * Constructs AZTEC atomic swaps
 *
 * @module proof
*/
const atomicSwapProof = {};

atomicSwapProof.checkNumberNotes = async (notes) => {
    const numMakerNotes = Object.keys(notes.makerNotes).length;
    const numTakerNotes = Object.keys(notes.takerNotes).length;
    const numNotes = numMakerNotes + numTakerNotes;

    if (numNotes !== 4) {
        Error('Incorrect number of notes');
    } else {
        console.log('success');
        return numNotes;
    }
};

/**
 * Construct AZTEC atomic swap proof transcript
 *
 * @method constructProof
 * @param {Array[Note]} notes array of AZTEC notes
 * @param {Number} m number of input notes
 * @param {string} sender Ethereum address of transaction sender
 * @returns {{proofData:Array[string]}, {challenge: string}} proof data and challenge
 */
atomicSwapProof.constructAtomicSwap = async (notes) => {
    const numNotes = await atomicSwapProof.checkNumberNotes(notes);

    // Restructure input object into an array
    const makerNotes = Object.values(notes.makerNotes);
    const takerNotes = Object.values(notes.takerNotes);
    const noteArray = [makerNotes[0], makerNotes[1], takerNotes[0], takerNotes[1]];

    // finalHash is used to create final proof challenge
    const finalHash = new Hash();
    // Append all notes into finalHash
    noteArray.forEach((note) => {
        finalHash.append(note.gamma);
        finalHash.append(note.sigma);
    });

    // Array of all bk
    const bkArray = [];
    console.log('finalHash: ', finalHash);
    
    // Generate the blinding factors
    const blindingFactors = noteArray.map((note, i) => { // creating the blinding factors
        // Create the blinding scalars
        let bk = bn128.randomGroupScalar();
        const ba = bn128.randomGroupScalar();
        let B;

        // Maker notes
        if (i <= 2) {
            B = note.gamma.mul(bk).add(bn128.h.mul(ba));
        } else { // Output notes
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

    const proofData = blindingFactors.map((blindingFactor, i) => {
        const kBar = ((noteArray[i].k.redMul(challenge)).redAdd(blindingFactor.bk)).fromRed();
        const aBar = ((noteArray[i].a.redMul(challenge)).redAdd(blindingFactor.ba)).fromRed();

        return [
            `0x${padLeft(kBar.toString(16), 64)}`,
            `0x${padLeft(aBar.toString(16), 64)}`,
            `0x${padLeft(noteArray[i].gamma.x.fromRed().toString(16), 64)}`,
            `0x${padLeft(noteArray[i].gamma.y.fromRed().toString(16), 64)}`,
            `0x${padLeft(noteArray[i].sigma.x.fromRed().toString(16), 64)}`,
            `0x${padLeft(noteArray[i].sigma.y.fromRed().toString(16), 64)}`,
        ];
    });
    return {
        proofData,
        challenge: `0x${padLeft(challenge)}`,
    };
};

module.exports = atomicSwapProof;
