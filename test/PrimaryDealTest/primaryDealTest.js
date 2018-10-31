// const BN = require('bn.js');
// const crypto = require('crypto');

// /* global artifacts, assert, contract, beforeEach, it:true */
// const OptimizedAZTEC = artifacts.require('./contracts/AZTEC/OptimizedAZTEC');
// const OptimizedAZTECInterface = artifacts.require('./contracts/AZTEC/OptimizedAZTECInterface');
// const TestPrimaryDeal = artifacts.require('./contracts/PrimaryDeal/TestPrimaryDeal');

// const aztecProof = require('../../zk-crypto-js/proof/proof');
// const utils = require('../../zk-crypto-js/utils/utils');
// const { t2 } = require('../../zk-crypto-js/params');
// const ecdsa = require('../../zk-crypto-js/secp256k1/ecdsa');
// const Keccak = require('../../zk-crypto-js/utils/keccak');
// const elliptic = require('elliptic');

// const secp256k1 = new elliptic.ec('secp256k1');
// const { toBytes32 } = utils;

// const fundAllocations = [
//     10001,
//     30001,
//     37001,
//     28001,
//     40001,
//     55001,
// ];

// const GROUP_MODULUS = new BN('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141', 16);
// const FIELD_MODULUS = new BN('fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f', 16);

// OptimizedAZTEC.abi = OptimizedAZTECInterface.abi;
// contract('Primary Deal Test', (accounts) => {
//     let aztec;
//     let primaryDeal;
//     let token;
//     beforeEach(async () => {
//         const t2Formatted = [
//             t2.x.c0.toString(10),
//             t2.x.c1.toString(10),
//             t2.y.c0.toString(10),
//             t2.y.c1.toString(10),
//         ];
//         aztec = await OptimizedAZTEC.new(accounts[0]);
//         primaryDeal = await TestPrimaryDeal.new(
//             aztec.address,
//             t2Formatted,
//         );

//     });

//     it('successfully initializes a deal', async () => {
//         const commitments = await aztecProof.constructCommitmentSet({
//             kIn: [],
//             kOut: fundAllocations,
//         });
//         let sum = fundAllocations.reduce((acc, f) => { return acc += (f - 1);}, 0);
//         expect(sum).to.equal(200000);
//         const fundAccounts = fundAllocations.map(() => ecdsa.generateKeyPair());

//         const { inputs, outputs, challenge } = aztecProof.constructCommit({ outputs: commitments.outputs, k: sum });
//         const outputFormatted = outputs.map(output => aztecProof.formatABI(output));
//         const challengeFormatted = challenge.toString(10);

//         const transferCertificate = `0x${utils.toBytes32(new BN(crypto.randomBytes(32), 16).toString(16))}`;
//         const seniorFacilitiesAgreement = `0x${utils.toBytes32(new BN(crypto.randomBytes(32), 16).toString(16))}`;
//         const dealTerms = `0x${utils.toBytes32(new BN(crypto.randomBytes(32), 16).toString(16))}`;
//         const fundMessages = [];
//         const fundSignatures = fundAccounts.map((fundAccount, i) => {
//             const message = web3.eth.abi.encodeParameters(['bytes32', 'bytes32', 'bytes32', 'bytes32', 'bytes32', 'bytes32', 'bytes32', 'uint'], [
//                 outputFormatted[i][2],
//                 outputFormatted[i][3],
//                 outputFormatted[i][4],
//                 outputFormatted[i][5],
//                 transferCertificate,
//                 seniorFacilitiesAgreement,
//                 dealTerms,
//                 sum
//             ]);

//             const hash = web3.utils.soliditySha3(message);
//             fundMessages.push(hash);
//             const { r, s, v } = ecdsa.signMessage(new BN(hash.slice(2), 16), fundAccount.privateKey);
//             return [
//                 `0x${utils.toBytes32(fundAccount.address.toString(16).slice(2))}`,
//                 `0x${utils.toBytes32(v.toString(16))}`,
//                 `0x${utils.toBytes32(r.toString(16))}`,
//                 `0x${utils.toBytes32(s.toString(16))}`,
//             ];
//         });

//         const borrowerMessage = web3.eth.abi.encodeParameters(['uint[4][]','bytes32', 'bytes32', 'bytes32', 'uint'], [
//         fundSignatures,
//         transferCertificate,
//         seniorFacilitiesAgreement,
//         dealTerms,
//         sum
//         ]);

//         const borrowerHash = web3.utils.soliditySha3(borrowerMessage);
//         const borrowerAccount = ecdsa.generateKeyPair();
//         const { r, s, v } = ecdsa.signMessage(new BN(borrowerHash.slice(2), 16), borrowerAccount.privateKey);
//         const borrowerSignature = [
//             `0x${utils.toBytes32(borrowerAccount.address.toString(16).slice(2))}`,
//             `0x${utils.toBytes32(v.toString(16))}`,
//             `0x${utils.toBytes32(r.toString(16))}`,
//             `0x${utils.toBytes32(s.toString(16))}`,
//         ];
//         let result = await primaryDeal.syndicate(
//             borrowerSignature,
//             fundSignatures,
//             transferCertificate,
//             seniorFacilitiesAgreement,
//             dealTerms,
//             outputFormatted,
//             challengeFormatted,
//             sum, {
//             from: accounts[0],
//             gas: 5000000,
//         });

//         expect(result.receipt && result.logs);
//         expect(result.logs.length).to.be.equal(15);
//         const fundSignatureLogs = result.logs.slice(1, 7);
//         const noteLogs = result.logs.slice(7, 13);
//         const documentLogs = result.logs.slice(13, 15);
//         expect(result.logs[0].event).to.be.equal("Signed");
//         expect(result.logs[0].args.signer).to.be.equal(borrowerAccount.address);
//         expect(result.logs[0].args.message).to.be.equal(borrowerHash);
//         fundSignatureLogs.forEach((log, i) => {
//             expect(log.event).to.be.equal("Signed");
//             expect(log.args.signer).to.be.equal(fundAccounts[i].address);
//             expect(log.args.message).to.be.equal(fundMessages[i]);
//         });
//         noteLogs.forEach((log, i) => {
//             expect(log.event).to.be.equal("InstantiatedNote");
//             expect(log.args.owner).to.be.equal(fundAccounts[i].address);
//             expect(log.args.noteHash).to.be.equal(web3.utils.sha3(web3.eth.abi.encodeParameters(
//                 ['bytes32', 'bytes32', 'bytes32', 'bytes32'],
//                 [outputFormatted[i][2], outputFormatted[i][3], outputFormatted[i][4], outputFormatted[i][5]],
//             )));
//         });
//         expect(documentLogs[0].event).to.be.equal("StoredDocument");
//         expect(documentLogs[0].args.documentHash).to.be.equal(transferCertificate);
//         expect(documentLogs[1].event).to.be.equal("StoredDocument");
//         expect(documentLogs[1].args.documentHash).to.be.equal(seniorFacilitiesAgreement);

//         console.log('validated primary deal syndication');
//         console.log('borrower account ', result.logs[0].args.signer, ' signed message ', result.logs[0].args.message);
//         fundSignatureLogs.forEach((log) => {
//             console.log('account ', log.args.signer, ' signed message ', log.args.message);
//         });
//         noteLogs.forEach((log) => {
//             console.log('account ', log.args.owner, ' owns AZTEC note ', log.args.noteHash);
//         });
//         console.log('created document hash ', documentLogs[0].args.documentHash);
//         console.log('created document hash ', documentLogs[1].args.documentHash);
//         console.log('receipt = ', result.receipt);
//     });
// });

