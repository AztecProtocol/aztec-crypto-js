const BN = require('bn.js');
const { padLeft } = require('web3-utils');


const Hash = require('../utils/keccak');
const bn128 = require('../bn128/bn128');

const { groupReduction } = bn128;


/**
 * Constructs AZTEC dividend computations
 *
 * @module dividendComputation
*/
const dividendComputation = {};

/**
 * Construct AZTEC dividend computation proof transcript
 *
 * @method constructProof
 * @param {Array[Note]} notes array of AZTEC notes
 * @returns {{proofData:Array[string]}, {challenge: string}} - proof data and challenge
 */
dividendComputation.constructPayment = (notes, za, zb, sender) => {
    // finalHash is used to create final proof challenge
    const rollingHash = new Hash();

    // Array to store bk values later
    const bkArray = [];

    // convert z_a and z_b into BN instances if they aren't one
    let zaBN;
    let zbBN;

    if (BN.isBN(za)) {
        zaBN = za;
    } else {
        zaBN = new BN(za);
    }

    if (BN.isBN(zb)) {
        zbBN = zb;
    } else {
        zbBN = new BN(zb);
    }

    notes.forEach((note) => {
        rollingHash.append(note.gamma);
        rollingHash.append(note.sigma);
    });

    // finalHash is used to create final proof challenge
    const finalHash = new Hash();
    finalHash.appendBN(new BN(sender.slice(2), 16));
    finalHash.appendBN(zaBN);
    finalHash.appendBN(zbBN);
    finalHash.data = [...finalHash.data, ...rollingHash.data];
    rollingHash.keccak();

    const blindingFactors = notes.map((note, i) => {
        let bk = bn128.randomGroupScalar();
        bkArray.push(bk);

        if (i === 2) {
            // statement to set bk for the residual commitment
            const zbRed = zb.toRed(groupReduction);
            const zaRed = za.toRed(groupReduction);

            // bk_3 = (z_b)(bk_2) - (z_a)(bk_1)
            bk = (zbRed.redMul(bkArray[1])).redSub(zaRed.redMul(bkArray[0]));
            bkArray.push(bk);
        }

        const ba = bn128.randomGroupScalar();
        let B;
        let x = new BN(0).toRed(groupReduction);

        if ((i) > 0) { // if it's an output note (defined as i = 1, i = 2)
            x = rollingHash.toGroupScalar(groupReduction);     
            const xbk = bk.redMul(x); // xbk = bk*x
            const xba = ba.redMul(x); // xba = ba*x
            rollingHash.keccak();
            B = note.gamma.mul(xbk).add(bn128.h.mul(xba));
        } else { // input note
            B = note.gamma.mul(bk).add(bn128.h.mul(ba));
        }

        finalHash.append(B);
        bkArray.push(bk);
        return {
            bk,
            ba,
            B,
            x,
        };
    });
    finalHash.keccak();
    const challenge = finalHash.toGroupScalar(groupReduction);
    const proofData = blindingFactors.map((blindingFactor, i) => {
        const kBar = ((notes[i].k.redMul(challenge)).redAdd(blindingFactor.bk)).fromRed();
        const aBar = ((notes[i].a.redMul(challenge)).redAdd(blindingFactor.ba)).fromRed();
        return [
            `0x${padLeft(kBar.toString(16), 64)}`,
            `0x${padLeft(aBar.toString(16), 64)}`,
            `0x${padLeft(notes[i].gamma.x.fromRed().toString(16), 64)}`,
            `0x${padLeft(notes[i].gamma.y.fromRed().toString(16), 64)}`,
            `0x${padLeft(notes[i].sigma.x.fromRed().toString(16), 64)}`,
            `0x${padLeft(notes[i].sigma.y.fromRed().toString(16), 64)}`,
        ];
    });

    return {
        proofData,
        challenge: `0x${padLeft(challenge)}`,
    };
};

module.exports = dividendComputation;
