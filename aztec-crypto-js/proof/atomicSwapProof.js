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

    // finalHash is used to create final proof challenge
    const finalHash = new Hash();
};

module.exports = atomicSwapProof;
