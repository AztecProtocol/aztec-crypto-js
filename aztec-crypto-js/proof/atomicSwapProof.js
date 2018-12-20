const BN = require('bn.js');
const { padLeft } = require('web3-utils');

const Hash = require('../utils/keccak');
const helpers = require('./atomicSwapHelpers');

/**
 * Constructs AZTEC atomic swaps
 *
 * @module atomicSwapProof
*/
const atomicSwapProof = {};

/**
 * Construct AZTEC atomic swap proof transcript
 *
 * @method constructProof
 * @param {Array[Note]} notes array of AZTEC notes
 * @returns {{proofData:Array[string]}, {challenge: string}} - proof data and challenge
 */
atomicSwapProof.constructAtomicSwap = (notes) => {
    helpers.checkNumberNotes(notes);
    const noteArray = helpers.makeNoteArray(notes);

    // finalHash is used to create final proof challenge
    const finalHash = new Hash();

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

/**
 * Verify AZTEC atomic swap proof transcript
 *
 * @method verifyAtomicSwap
 * @param {Array[proofData]} proofData - proofData array of AZTEC notes
 * @param {big number instance} challenge - challenge variable used in zero-knowledge protocol 
 * @returns {number} - returns 1 if proof is validated, throws an error if not
 */
atomicSwapProof.verifyAtomicSwap = (proofData, challenge) => {
    const proofDataBn = helpers.convertToBn(proofData);
    const formattedChallenge = new BN(challenge.slice(2), 16);

    const finalHash = new Hash();

    proofDataBn.forEach((proofElement) => {
        finalHash.append(proofElement[6]);
        finalHash.append(proofElement[7]);
    });

    const { recoveredChallenge } = helpers.recoverBlindingFactorsAndChallenge(proofDataBn, formattedChallenge, finalHash);
    const finalChallenge = `0x${padLeft(recoveredChallenge)}`;

    // Check if the recovered challenge, matches the original challenge. If so, proof construction is validated
    if (finalChallenge === challenge) {
        return 1;
    } else {
        throw new Error('proof validation failed');
    }
};

module.exports = atomicSwapProof;
