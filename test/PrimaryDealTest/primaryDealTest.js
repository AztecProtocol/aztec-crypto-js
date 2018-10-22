const BN = require('bn.js');
const crypto = require('crypto');

/* global artifacts, assert, contract, beforeEach, it:true */
const OptimizedAZTEC = artifacts.require('./contracts/AZTEC/OptimizedAZTEC');
const OptimizedAZTECInterface = artifacts.require('./contracts/AZTEC/OptimizedAZTECInterface');
const TestPrimaryDeal = artifacts.require('./contracts/PrimaryDeal/TestPrimaryDeal');

const aztecProof = require('../../zk-crypto-js/proof/proof');
const utils = require('../../zk-crypto-js/utils/utils');
const { t2 } = require('../../zk-crypto-js/params');
const ecdsa = require('../../zk-crypto-js/secp256k1/ecdsa');
const Keccak = require('../../zk-crypto-js/utils/keccak');
const elliptic = require('elliptic');

const secp256k1 = new elliptic.ec('secp256k1');
const { toBytes32 } = utils;

const fundAllocations = [
    10001,
    30001,
    37001,
    28001,
    40001,
    55001,
];

/* failing signature transcript

fund message =  0x1ea7f4acbf5a643addb79d8e0d9d316dfcf09bac2bad31c89553fde28af88630
v =  0x000000000000000000000000000000000000000000000000000000000000001c
r =  0xe22f75630875c217d831c8c061b2fb40398cbe57d9636839d0775cfc7ea8f9df
s =  0x73124dc17582a31d19a50d1ef45bae4e0b2ed8663a74252e09f5a1370aeaf512
address =  0xB0A14D647e252Bd6bC676a30EafbEb8385afb1c1
private key =  <BN: d923ff776c59bbd95a033a5e2f2546c29d7306636f4b8e4f582d61174d5f0>
public key x =  f12642b48e924cdefedd5d8ea0df80ac7acfcd8e06c8bc7e9e42530dcbe452d7
public key y =  76e0272d17b578bac7b213dc33a129e150a9b581890d76c3e673e802c908ecaa
gamma x =  0x1ecbdea13a5651108a07ae68654e396a66877c72dfb96f03188e718658ac8521
gamma y =  0x08f4ff0d0750c36b82222c7f44a2a2c7c07a11b84f10d2f47e59211948489c41
sigma x =  0x283828b3abb88c0c0434d0830c53c81fb20b58c00ab56de746dee31e2d2877a9
sigma y =  0x151274a01e9de96112eed7d0218055bc1cc317f8af35e26697fd3fb662b841f0
transfer cert =  0x5fa09a02772cbfc0e6ed8792fcadd593b60b0500791eeea19992fc0d5b42b426
sfa =  0xe4a02bf9947623e4da5eede6a744bcd1ddd46aee88c1dde3238b3c795e86a3bc
deal terms =  0x0c468f275bd816fad274ce5589e9f8d3982db2c01de0d91685b4e64cc4752276
sum =  200000
abi message =  0x1ecbdea13a5651108a07ae68654e396a66877c72dfb96f03188e718658ac852108f4ff0d0750c36b82222c7f44a2a2c7c07a11b84f10d2f47e59211948489c41283828b3abb88c0c0434d0830c53c81fb20b58c00ab56de746dee31e2d2877a9151274a01e9de96112eed7d0218055bc1cc317f8af35e26697fd3fb662b841f05fa09a02772cbfc0e6ed8792fcadd593b60b0500791eeea19992fc0d5b42b426e4a02bf9947623e4da5eede6a744bcd1ddd46aee88c1dde3238b3c795e86a3bc0c468f275bd816fad274ce5589e9f8d3982db2c01de0d91685b4e64cc47522760000000000000000000000000000000000000000000000000000000000030d40

*/
// 0x96FccA57792aC4138d2Ed4dBC12140739324C987
// '0x00000000000000000000000018C01c522DEEC052C45D06A6885c547566d966b2'
// "0x1ed46274301b27dc8bfb34b38b64f0729a7662c628205eb9b37aff16c20e26de",
// "0x000000000000000000000000000000000000000000000000000000000000001c",
// "0x98e4874f0c154e42e2fb22b85fc4fe42eefbaa67761f4a0ee053b0f6f3c372bd",
// "0x2ef7cd717d61fad5fbb38ca6adb19b069d2404258b3c4e8dd5faced5d5771a4c"
const GROUP_MODULUS = new BN('fffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141', 16);
const FIELD_MODULUS = new BN('fffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2f', 16);

OptimizedAZTEC.abi = OptimizedAZTECInterface.abi;
contract.only('Primary Deal Test', (accounts) => {
    let aztec;
    let primaryDeal;
    let token;
    beforeEach(async () => {
        const t2Formatted = [
            t2.x.c0.toString(10),
            t2.x.c1.toString(10),
            t2.y.c0.toString(10),
            t2.y.c1.toString(10),
        ];
        aztec = await OptimizedAZTEC.new(accounts[0]);
        primaryDeal = await TestPrimaryDeal.new(
            aztec.address,
            t2Formatted,
        );

    });

    it.only('successfully initializes a deal', async () => {
        const commitments = await aztecProof.constructCommitmentSet({
            kIn: [],
            kOut: fundAllocations,
        });
        let sum = fundAllocations.reduce((acc, f) => { return acc += (f - 1);}, 0);
        expect(sum).to.equal(200000);
        const fundAccounts = fundAllocations.map(() => ecdsa.generateKeyPair());

        const { inputs, outputs, challenge } = aztecProof.constructCommit({ outputs: commitments.outputs, k: sum });
        const outputFormatted = outputs.map(output => aztecProof.formatABI(output));
        const challengeFormatted = challenge.toString(10);

        const transferCertificate = `0x${utils.toBytes32(new BN(crypto.randomBytes(32), 16).toString(16))}`;
        const seniorFacilitiesAgreement = `0x${utils.toBytes32(new BN(crypto.randomBytes(32), 16).toString(16))}`;
        const dealTerms = `0x${utils.toBytes32(new BN(crypto.randomBytes(32), 16).toString(16))}`;
        const fundMessages = [];
        const fundSignatures = fundAccounts.map((fundAccount, i) => {
            const message = web3.eth.abi.encodeParameters(['bytes32', 'bytes32', 'bytes32', 'bytes32', 'bytes32', 'bytes32', 'bytes32', 'uint'], [
                outputFormatted[i][2],
                outputFormatted[i][3],
                outputFormatted[i][4],
                outputFormatted[i][5],
                transferCertificate,
                seniorFacilitiesAgreement,
                dealTerms,
                sum
            ]);

            const hash = web3.utils.soliditySha3(message);
            fundMessages.push(hash);
            const { r, s, v } = ecdsa.signMessage(new BN(hash.slice(2), 16), fundAccount.privateKey);
            return [
                `0x${utils.toBytes32(fundAccount.address.toString(16).slice(2))}`,
                `0x${utils.toBytes32(v.toString(16))}`,
                `0x${utils.toBytes32(r.toString(16))}`,
                `0x${utils.toBytes32(s.toString(16))}`,
            ];
        });

        const borrowerMessage = web3.eth.abi.encodeParameters(['uint[4][]','bytes32', 'bytes32', 'bytes32', 'uint'], [
        fundSignatures,
        transferCertificate,
        seniorFacilitiesAgreement,
        dealTerms,
        sum
        ]);

        const borrowerHash = web3.utils.soliditySha3(borrowerMessage);
        const borrowerAccount = ecdsa.generateKeyPair();
        const { r, s, v } = ecdsa.signMessage(new BN(borrowerHash.slice(2), 16), borrowerAccount.privateKey);
        const borrowerSignature = [
            `0x${utils.toBytes32(borrowerAccount.address.toString(16).slice(2))}`,
            `0x${utils.toBytes32(v.toString(16))}`,
            `0x${utils.toBytes32(r.toString(16))}`,
            `0x${utils.toBytes32(s.toString(16))}`,
        ];
        let result = await primaryDeal.syndicate(
            borrowerSignature,
            fundSignatures,
            transferCertificate,
            seniorFacilitiesAgreement,
            dealTerms,
            outputFormatted,
            challengeFormatted,
            sum, {
            from: accounts[0],
            gas: 5000000,
        });

        expect(result.receipt && result.logs);
        expect(result.logs.length).to.be.equal(15);
        const fundSignatureLogs = result.logs.slice(1, 7);
        const noteLogs = result.logs.slice(7, 13);
        const documentLogs = result.logs.slice(13, 15);
        expect(result.logs[0].event).to.be.equal("Signed");
        expect(result.logs[0].args.signer).to.be.equal(borrowerAccount.address);
        expect(result.logs[0].args.message).to.be.equal(borrowerHash);
        fundSignatureLogs.forEach((log, i) => {
            expect(log.event).to.be.equal("Signed");
            expect(log.args.signer).to.be.equal(fundAccounts[i].address);
            expect(log.args.message).to.be.equal(fundMessages[i]);
        });
        noteLogs.forEach((log, i) => {
            expect(log.event).to.be.equal("InstantiatedNote");
            expect(log.args.owner).to.be.equal(fundAccounts[i].address);
            expect(log.args.noteHash).to.be.equal(web3.utils.sha3(web3.eth.abi.encodeParameters(
                ['bytes32', 'bytes32', 'bytes32', 'bytes32'],
                [outputFormatted[i][2], outputFormatted[i][3], outputFormatted[i][4], outputFormatted[i][5]],
            )));
        });
        expect(documentLogs[0].event).to.be.equal("StoredDocument");
        expect(documentLogs[0].args.documentHash).to.be.equal(transferCertificate);
        expect(documentLogs[1].event).to.be.equal("StoredDocument");
        expect(documentLogs[1].args.documentHash).to.be.equal(seniorFacilitiesAgreement);

        console.log('validated primary deal syndication');
        console.log('borrower account ', result.logs[0].args.signer, ' signed message ', result.logs[0].args.message);
        fundSignatureLogs.forEach((log) => {
            console.log('account ', log.args.signer, ' signed message ', log.args.message);
        });
        noteLogs.forEach((log) => {
            console.log('account ', log.args.owner, ' owns AZTEC note ', log.args.noteHash);
        });
        console.log('created document hash ', documentLogs[0].args.documentHash);
        console.log('created document hash ', documentLogs[1].args.documentHash);

    });
});

