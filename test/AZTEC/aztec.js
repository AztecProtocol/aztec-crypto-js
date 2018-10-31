/* global artifacts, assert, contract, beforeEach, it:true */
const AZTEC = artifacts.require('./contracts/AZTEC/AZTEC');
const AZTECInterface = artifacts.require('./contracts/AZTEC/AZTECInterface');

const aztecProof = require('../../zk-crypto-js/proof/proofOptimized');
const utils = require('../../zk-crypto-js/utils/utils');
const { t2Formatted } = require('../../zk-crypto-js/params');

const { toBytes32 } = utils;

AZTEC.abi = AZTECInterface.abi;
contract.only('AZTEC', (accounts) => {
    let aztec;
    beforeEach(async () => {
        aztec = await AZTEC.new(accounts[0]);
    });

    it.only('succesfully validates an AZTEC JOIN-SPLIT zero-knowledge proof', async () => {
        let gas = 0;
        const { commitments, m } = await aztecProof.constructModifiedCommitmentSet({ kIn: [11, 22 ], kOut: [ 5, 28 ]});
        const { proofData, challenge } = aztecProof.constructModifiedJoinSplit(commitments, m, 0);
     //    console.log('proofData = ', proofData);
        const result = await aztec.validateJoinSplit(proofData, m, challenge, t2Formatted, {
            from: accounts[0],
            gas: 4000000,
        });
        console.log('result = ', result);
        // gas += Number(result.receipt.gasUsed);
        // console.log('gas = ', gas);
        // printJoinSplitTrace({ challenge, t2Formatted, outputFormatted, inputFormatted });
        // console.log('result = ', result);
        // console.log('result receipt = ', result.receipt);
        assert(result === true);
    });

    it('succesfully validates an AZTEC JOIN-SPLIT zero-knowledge proof', async () => {
        let gas = 0;
        const commitments = await aztecProof.constructCommitmentSet({ kIn: [11, 22 ], kOut: [ 5, 28 ]});
        const { proofInputs, proofOutputs, challenge } = aztecProof.constructJoinSplit(commitments);
        const result = await aztec.validateJoinSplit(proofInputs, proofOutputs, challenge, t2Formatted, {
            from: accounts[0],
            gas: 4000000,
        });
        // gas += Number(result.receipt.gasUsed);
        // console.log('gas = ', gas);
        // printJoinSplitTrace({ challenge, t2Formatted, outputFormatted, inputFormatted });
        // console.log('result = ', result);
        // console.log('result receipt = ', result.receipt);
        assert(result === true);
    });


    it('succesfully validates an AZTEC COMMIT zero-knowledge proof', async () => {
        const k = 33;
        const commitments = await aztecProof.constructCommitmentSet({ kIn: [], kOut: [11, 22] });
        const { proofOutputs, challenge } = aztecProof.constructCommit({ outputs: commitments.outputs, k });

        const result = await aztec.validateCommit(proofOutputs, challenge, 33, t2Formatted, {
            from: accounts[0],
            gas: 4000000,
        });

        console.log('result = ', result);
        assert(result === true);
    });



    it('succesfully validates an AZTEC REVEAL zero-knowledge proof', async () => {
        const k = 33;
        const commitments = await aztecProof.constructCommitmentSet({ kIn: [11, 22], kOut: [] });
        const { proofInputs, challenge } = aztecProof.constructReveal({ inputs: commitments.inputs, k });

        const result = await aztec.validateReveal(proofInputs, challengeFormatted, 33, t2Formatted, {
            from: accounts[0],
            gas: 4000000,
        });

        console.log('result = ', result);
        assert(result === true);
    });
});

// function printJoinSplitTrace({ challenge, t2Formatted, outputFormatted, inputFormatted }) {
//     console.log('mstore(0x00, 0x471f654200000000000000000000000000000000000000000000000000000000)');
//     console.log('mstore(0x04, 0xe0)');
//     console.log('mstore(0x24, 0x280)');
//     console.log(`mstore(0x44, 0x${challenge.toString(16)})`);
//     let memcount = 100;
//     for (let i = 0; i < t2Formatted.length; i++) {
//         console.log(`mstore(0x${memcount.toString(16)}, ${t2Formatted[i]})`);
//         memcount += 32;
//     }
//     console.log(`mstore(0x${memcount.toString(16)}, 0x02)`);
//     memcount += 32;
//     for (let i = 0; i < inputFormatted.length; i++) {
//         for (let j = 0; j < inputFormatted[i].length; j++) {
//             console.log(`mstore(0x${memcount.toString(16)}, ${inputFormatted[i][j]})`);
//             memcount += 32;

//         }
//     }
//     console.log(`mstore(0x${memcount.toString(16)}, 0x02)`);
//     memcount += 32;
//     for (let i = 0; i < outputFormatted.length; i++) {
//         for (let j = 0; j < outputFormatted[i].length; j++) {
//             console.log(`mstore(0x${memcount.toString(16)}, ${outputFormatted[i][j]})`);
//             memcount += 32;

//         }
//     }
// }

// function printCommitTrace({ challenge, t2Formatted, outputFormatted, k }) {
//     console.log('mstore(0x00, 0x48036bf100000000000000000000000000000000000000000000000000000000)');
//     console.log('mstore(0x04, 0xe0)');
//     console.log(`mstore(0x24, 0x${challenge.toString(16)})`);
//     console.log(`mstore(0x44, ${k})`);
//     let memcount = 100;
//     for (let i = 0; i < t2Formatted.length; i++) {
//         console.log(`mstore(0x${memcount.toString(16)}, ${t2Formatted[i]})`);
//         memcount += 32;
//     }
//     console.log(`mstore(0x${memcount.toString(16)}, 0x02)`);
//     console.log(`mstore(0x${memcount.toString(16)}, 0x02)`);
//     memcount += 32;
//     for (let i = 0; i < outputFormatted.length; i++) {
//         for (let j = 0; j < outputFormatted[i].length; j++) {
//             console.log(`mstore(0x${memcount.toString(16)}, ${outputFormatted[i][j]})`);
//             memcount += 32;

//         }
//     }
// }

// function printRevealTrace({ challenge, t2Formatted, inputFormatted, k }) {
//     console.log('mstore(0x00, 0x0x7dbb5f4700000000000000000000000000000000000000000000000000000000)');
//     console.log('mstore(0x04, 0xe0)');
//     console.log(`mstore(0x24, 0x${challenge.toString(16)})`);
//     console.log(`mstore(0x44, ${k})`);
//     let memcount = 100;
//     for (let i = 0; i < t2Formatted.length; i++) {
//         console.log(`mstore(0x${memcount.toString(16)}, ${t2Formatted[i]})`);
//         memcount += 32;
//     }
//     console.log(`mstore(0x${memcount.toString(16)}, 0x02)`);
//     console.log(`mstore(0x${memcount.toString(16)}, 0x02)`);
//     memcount += 32;
//     for (let i = 0; i < inputFormatted.length; i++) {
//         for (let j = 0; j < inputFormatted[i].length; j++) {
//             console.log(`mstore(0x${memcount.toString(16)}, ${inputFormatted[i][j]})`);
//             memcount += 32;

//         }
//     }
// }