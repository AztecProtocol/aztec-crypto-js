/* global artifacts, assert, contract, beforeEach, it:true */
const OptimizedAZTEC = artifacts.require('./contracts/AZTEC/OptimizedAZTEC');
const OptimizedAZTECInterface = artifacts.require('./contracts/AZTEC/OptimizedAZTECInterface');
const AZTECTokenMintable = artifacts.require('./contracts/AZTEC/AZTECTokenMintable');

const aztecProof = require('../../zk-crypto-js/proof/proof');
const utils = require('../../zk-crypto-js/utils/utils');
const { t2 } = require('../../zk-crypto-js/params');

const { toBytes32 } = utils;

OptimizedAZTEC.abi = OptimizedAZTECInterface.abi;
contract('AZTEC Mintable Token', (accounts) => {
    let aztec;
    let token;
    beforeEach(async () => {
        aztec = await OptimizedAZTEC.new(accounts[0]);

        // const t2Formatted = [
        //     t2.x.c0.toString(10),
        //     t2.x.c1.toString(10),
        //     t2.y.c0.toString(10),
        //     t2.y.c1.toString(10),
        // ];
        // token = await AZTECTokenMintable.new(t2Formatted, aztec.address, {
        //     from: accounts[0],
        //     gas: 5000000,
        // });
    });


    it('successfully creates AZTEC note registry', async () => {
        console.log('constructing commitments');
        const commitments = await aztecProof.constructCommitmentSet({
            kIn: [],
            kOut: [ 123, 456, 732, 3424, 1324, 23422 ],
        });
        const sum = 123 + 456 + 732 + 3424 + 1324 + 23422 - 6;
        const outputAccounts = [
            accounts[1],
            accounts[2],
            accounts[3],
            accounts[4],
            accounts[5],
            accounts[6],
        ];
        const { inputs, outputs, challenge } = aztecProof.constructCommit({ outputs: commitments.outputs, k: sum });
        const outputFormatted = outputs.map(output => aztecProof.formatABI(output));
        const challengeFormatted = challenge.toString(10);

        console.log('aztec address = ', aztec.address);
        console.log('creating new contract');

        const t2Formatted = [
            t2.x.c0.toString(10),
            t2.x.c1.toString(10),
            t2.y.c0.toString(10),
            t2.y.c1.toString(10),
        ];
        const k = [];
        const a = [];
        const gammaX = [];
        const gammaY = [];
        const sigmaX = [];
        const sigmaY = [];
    
        outputFormatted.forEach((output, i) => {
            k[i] = output[0];
            a[i] = output[1];
            gammaX[i] = output[2];
            gammaY[i] = output[3];
            sigmaX[i] = output[4];
            sigmaY[i] = output[5];
        });
        console.log('outputFormatted = ', outputFormatted);
        console.log('total supply = ', sum);
        // console.log('a = ', a);
        // console.log('gammaX = ', gammaX);
        // console.log('gammaY = ', gammaY);
        // console.log('sigmaX = ', sigmaX);
        // console.log('sigmaY = ', sigmaY);
        let result = await AZTECTokenMintable.new(
            t2Formatted,
            aztec.address,
            outputAccounts,
            k,
            a,
            gammaX,
            gammaY,
            sigmaX,
            sigmaY, 
            challengeFormatted,
            sum, {
            from: accounts[0],
            gas: 5000000,
        });
        const txHash = result.contract.transactionHash;
        const receipt = await web3.eth.getTransactionReceipt(txHash);
        // console.log('receipt? = ', result);
        const blah = await result.getPastEvents();
        // console.log('result.allEvents() = ', blah);
        // console.log('logs ? = ' , receipt.logs);
    //    console.log('result.receipt = ', result);
        // // printAZTECTokenMintableTrace({ t2Formatted, outputAccounts, outputFormatted, challenge, sum });
        // let result = await token.mint(
        //     outputAccounts,
        //     outputFormatted,
        //     challengeFormatted,
        //     sum,
        //     {
        //         from: accounts[0],
        //         gas: 5000000,
        //     }
        // );
        // if (result.logs && result.logs.length > 0) {
        //     result.logs.forEach((log) => {
        //         console.log(log.args);
        //     });
        // }
        // console.log('result = ', result);


        // // printAZTECTokenMintableTrace({ t2Formatted, outputAccounts, outputFormatted, challenge, sum });
        // let result = await token.mint(
        //     outputAccounts,
        //     outputFormatted,
        //     challengeFormatted,
        //     sum,
        //     {
        //         from: accounts[0],
        //         gas: 5000000,
        //     }
        // );
        // if (result.logs && result.logs.length > 0) {
        //     result.logs.forEach((log) => {
        //         console.log(log.args);
        //     });
        // }
        // console.log('result = ', result);
        assert(result === true);
    });
});


function printAZTECTokenMintableTrace({ challenge, t2Formatted, outputFormatted, outputAccounts, sum }) {
    let memcount = 0;
    for (let i = 0; i < t2Formatted.length; i++) {
        console.log(`mstore(0x${memcount.toString(16)}, ${t2Formatted[i]})`);
        memcount += 32;
    }
    console.log(`mstore(0x${memcount.toString(16)}, <>)`);
    memcount += 32;
    console.log(`mstore(0x${memcount.toString(16)}, <initial note owners>)`);
    memcount += 32;
    console.log(`mstore(0x${memcount.toString(16)}, <initial notes>)`);
    memcount += 32;
    console.log(`mstore(0x${memcount.toString(16)}, ${challenge.toString(10)})`);
    memcount += 32;
    console.log(`mstore(0x${memcount.toString(16)}, ${sum})`);
    memcount += 32;
    console.log(`mstore(0x${memcount.toString(16)}, ${outputAccounts.length})`);
    memcount += 32;
    for (let i = 0; i < outputAccounts.length; i++) {
        console.log(`mstore(0x${memcount.toString(16)}, ${outputAccounts[i]})`);
        memcount += 32;
    }
    console.log(`mstore(0x${memcount.toString(16)}, ${outputFormatted.length})`);
    memcount += 32;
    for (let i = 0; i < outputFormatted.length; i++) {
        for (let j = 0; j < outputFormatted[i].length; j++) {
            console.log(`mstore(0x${memcount.toString(16)}, ${outputFormatted[i][j]})`);
            memcount += 32;
        }
    }
}
