const BN = require('bn.js');
const crypto = require('crypto');
const { padLeft } = require('web3-utils');

const Hash = require('../utils/keccak');
const bn128 = require('../bn128/bn128');
const setup = require('../setup/setup');
const helpers = require('./atomicSwapHelpers');

const { groupReduction } = bn128;

/**
 * Constructs AZTEC atomic swaps
 *
 * @module proof
*/
const atomicSwapProof = {};

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
    const numNotes = await helpers.checkNumberNotes(notes);
    const noteArray = await helpers.makeNoteArray(notes);

    // finalHash is used to create final proof challenge
    const finalHash = new Hash();

    // Append all notes into finalHash
    noteArray.forEach((note) => {
        finalHash.append(note.gamma);
        finalHash.append(note.sigma);
    });

    const { blindingFactors, challenge } = helpers.getBlindingFactorsAndChallenge(noteArray, finalHash);

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
