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
 * @returns {{proofData:Array[string]}, {challenge: string}} proof data and challenge
 */
atomicSwapProof.constructAtomicSwap = async (notes) => {
    await helpers.checkNumberNotes(notes);
    const noteArray = await helpers.makeNoteArray(notes);

    // finalHash is used to create final proof challenge
    const finalHash = new Hash();

    // Append all notes into finalHash
    noteArray.forEach((note) => {
        finalHash.append(note.gamma);
        finalHash.append(note.sigma);
    });

    const { blindingFactors, challenge } = await helpers.getBlindingFactorsAndChallenge(noteArray, finalHash);

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

atomicSwapProof.verifyAtomicSwap = async (proofData, challenge) => {
    const proofDataBn = await helpers.convertToBn(proofData);
    const formattedChallenge = new BN(challenge.slice(2), 16);

    const finalHash = new Hash();

    // Append all notes into finalHash
    proofDataBn.forEach((proofElement) => {
        finalHash.append(proofElement[6]);
        finalHash.append(proofElement[7]);
    });

    // Validate that the commitments lie on the bn128 curve
    proofDataBn.map((proofElement) => {
        helpers.validateOnCurve(proofElement[2], proofElement[3]); // checking gamma point
        helpers.validateOnCurve(proofElement[4], proofElement[5]); // checking sigma point
    });

    const { recoveredChallenge } = await helpers.recoverBlindingFactorsAndChallenge(proofDataBn, formattedChallenge, finalHash);
    const finalChallenge = `0x${padLeft(recoveredChallenge)}`;

    console.log('final challenge: ', finalChallenge);
    console.log('original challenge: ', challenge);

    // Check if the recovered challenge, matches the original challenge. If so, proof construction is validated
    if (finalChallenge === challenge) {
        return 1;
    } else {
        throw new Error('proof validation failed');
    }
};

module.exports = atomicSwapProof;
