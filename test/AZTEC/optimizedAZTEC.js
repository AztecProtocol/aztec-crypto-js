/* global artifacts, assert, contract, beforeEach, it:true */
const OptimizedAZTEC = artifacts.require('./contracts/AZTEC/OptimizedAZTEC');
const OptimizedAZTECInterface = artifacts.require('./contracts/AZTEC/OptimizedAZTECInterface');

const aztecProof = require('../../zk-crypto-js/proof/proof');
const utils = require('../../zk-crypto-js/utils/utils');
const { t2 } = require('../../zk-crypto-js/params');

const { toBytes32 } = utils;

OptimizedAZTEC.abi = OptimizedAZTECInterface.abi;
contract('Optimized AZTEC', (accounts) => {
    let aztec;
    beforeEach(async () => {
        aztec = await OptimizedAZTEC.new(accounts[0]);
    });


    it('succesfully validates an AZTEC JOIN-SPLIT zero-knowledge proof', async () => {
        const commitments = await aztecProof.constructCommitmentSet({ kIn: [11, 22 ], kOut: [ 5, 28 ]});
        const { inputs, outputs, challenge } = aztecProof.constructJoinSplit(commitments);
        const inputFormatted = inputs.map(input => aztecProof.formatABI(input));
        const outputFormatted = outputs.map(output => aztecProof.formatABI(output));
        const challengeFormatted = challenge.toString(10);
        const t2Formatted = [
            t2.x.c0.toString(10),
            t2.x.c1.toString(10),
            t2.y.c0.toString(10),
            t2.y.c1.toString(10),
        ];
        const result = await aztec.validateJoinSplit(inputFormatted, outputFormatted, challengeFormatted, t2Formatted, {
            from: accounts[0],
            gas: 4000000,
        });
        printJoinSplitTrace({ challenge, t2Formatted, outputFormatted, inputFormatted });
        console.log('result = ', result);
        assert(result === true);
    });


    it('succesfully validates an AZTEC COMMIT zero-knowledge proof', async () => {
        const k = 31;
        const commitments = await aztecProof.constructCommitmentSet({ kIn: [], kOut: [11, 22] });
        const { inputs, outputs, challenge } = aztecProof.constructCommit({ outputs: commitments.outputs, k });
        const outputFormatted = outputs.map(output => aztecProof.formatABI(output));
        const challengeFormatted = challenge.toString(10);
        const t2Formatted = [
            t2.x.c0.toString(10),
            t2.x.c1.toString(10),
            t2.y.c0.toString(10),
            t2.y.c1.toString(10),
        ];
        const result = await aztec.validateCommit(outputFormatted, challengeFormatted, 31, t2Formatted, {
            from: accounts[0],
            gas: 4000000,
        });

        console.log('result = ', result);
        assert(result === true);
    });



    it('succesfully validates an AZTEC REVEAL zero-knowledge proof', async () => {
        const k = 31;
        const commitments = await aztecProof.constructCommitmentSet({ kIn: [11, 22], kOut: [] });
        const { inputs, outputs, challenge } = aztecProof.constructReveal({ inputs: commitments.inputs, k });
        const inputFormatted = inputs.map(input => aztecProof.formatABI(input));
        const challengeFormatted = challenge.toString(10);
        const t2Formatted = [
            t2.x.c0.toString(10),
            t2.x.c1.toString(10),
            t2.y.c0.toString(10),
            t2.y.c1.toString(10),
        ];

        const result = await aztec.validateReveal(inputFormatted, challengeFormatted, 31, t2Formatted, {
            from: accounts[0],
            gas: 4000000,
        });

        console.log('result = ', result);
        assert(result === true);
    });
});

function printJoinSplitTrace({ challenge, t2Formatted, outputFormatted, inputFormatted }) {
    console.log('mstore(0x00, 0x471f654200000000000000000000000000000000000000000000000000000000)');
    console.log('mstore(0x04, 0xe0)');
    console.log('mstore(0x24, 0x280)');
    console.log(`mstore(0x44, 0x${challenge.toString(16)})`);
    let memcount = 100;
    for (let i = 0; i < t2Formatted.length; i++) {
        console.log(`mstore(0x${memcount.toString(16)}, ${t2Formatted[i]})`);
        memcount += 32;
    }
    console.log(`mstore(0x${memcount.toString(16)}, 0x02)`);
    memcount += 32;
    for (let i = 0; i < inputFormatted.length; i++) {
        for (let j = 0; j < inputFormatted[i].length; j++) {
            console.log(`mstore(0x${memcount.toString(16)}, ${inputFormatted[i][j]})`);
            memcount += 32;

        }
    }
    console.log(`mstore(0x${memcount.toString(16)}, 0x02)`);
    memcount += 32;
    for (let i = 0; i < outputFormatted.length; i++) {
        for (let j = 0; j < outputFormatted[i].length; j++) {
            console.log(`mstore(0x${memcount.toString(16)}, ${outputFormatted[i][j]})`);
            memcount += 32;

        }
    }
}

function printCommitTrace({ challenge, t2Formatted, outputFormatted, k }) {
    console.log('mstore(0x00, 0x48036bf100000000000000000000000000000000000000000000000000000000)');
    console.log('mstore(0x04, 0xe0)');
    console.log(`mstore(0x24, 0x${challenge.toString(16)})`);
    console.log(`mstore(0x44, ${k})`);
    let memcount = 100;
    for (let i = 0; i < t2Formatted.length; i++) {
        console.log(`mstore(0x${memcount.toString(16)}, ${t2Formatted[i]})`);
        memcount += 32;
    }
    console.log(`mstore(0x${memcount.toString(16)}, 0x02)`);
    console.log(`mstore(0x${memcount.toString(16)}, 0x02)`);
    memcount += 32;
    for (let i = 0; i < outputFormatted.length; i++) {
        for (let j = 0; j < outputFormatted[i].length; j++) {
            console.log(`mstore(0x${memcount.toString(16)}, ${outputFormatted[i][j]})`);
            memcount += 32;

        }
    }
}

function printRevealTrace({ challenge, t2Formatted, inputFormatted, k }) {
    console.log('mstore(0x00, 0x0x7dbb5f4700000000000000000000000000000000000000000000000000000000)');
    console.log('mstore(0x04, 0xe0)');
    console.log(`mstore(0x24, 0x${challenge.toString(16)})`);
    console.log(`mstore(0x44, ${k})`);
    let memcount = 100;
    for (let i = 0; i < t2Formatted.length; i++) {
        console.log(`mstore(0x${memcount.toString(16)}, ${t2Formatted[i]})`);
        memcount += 32;
    }
    console.log(`mstore(0x${memcount.toString(16)}, 0x02)`);
    console.log(`mstore(0x${memcount.toString(16)}, 0x02)`);
    memcount += 32;
    for (let i = 0; i < inputFormatted.length; i++) {
        for (let j = 0; j < inputFormatted[i].length; j++) {
            console.log(`mstore(0x${memcount.toString(16)}, ${inputFormatted[i][j]})`);
            memcount += 32;

        }
    }
}