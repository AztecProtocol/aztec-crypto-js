/* eslint-disable no-plusplus */
const Web3 = require('web3');
const Tx = require('ethereumjs-tx');
const fs = require('fs');
const BN = require('bn.js');
const crypto = require('crypto');

const AZTEC = require('../../build/contracts/AZTEC.json');
const AZTECERC20Bridge = require('../../build/contracts/AZTECERC20Bridge.json');
const AZTECInterface = require('../../build/contracts/AZTECInterface.json');
const ERC20Mintable = require('../../build/contracts/ERC20Mintable.json');

const aztecProof = require('../proof/proof');
const sign = require('../utils/sign');
const utils = require('../utils/utils');
const AZTECWallet = require('../wallet/wallet');
const { t2Formatted, GROUP_MODULUS } = require('../params');


const { toBytes32 } = utils;
const bn128 = require('../bn128/bn128');

const scalingFactor = new BN('100000000000000000', 10);
// @dev helper method to turn a web3.eth.Contract constructor call into a method call that
// first constructs an unsigned transaction, before signing it and transmitting it to the blockchain
function constructConstructorCall(abi, bytecode) {
    const constructorCall = async (...args) => {
        const { sender, privateKey, nonce } = args.slice(-1)[0];
        const params = args.slice(0, -1);
        const deployBase = new this.web3.eth.Contract(abi).deploy({ data: bytecode, arguments: params });
    
        const transaction = new Tx({
            nonce: this.web3.utils.toHex(nonce),
            gas: `0x${new BN(await deployBase.estimateGas({ from: sender }), 10).toString(16)}`,
            gasPrice: `0x${new BN(this.web3.utils.toWei('5', 'gwei'), 10).toString(16)}`,
            data: deployBase.encodeABI(),
            from: sender,
        });
        transaction.sign(Buffer.from(privateKey.slice(2), 'hex'));
        return this.web3.eth.sendSignedTransaction(`0x${transaction.serialize().toString('hex')}`);
    };
    return constructorCall;
}

// @dev helper method to turn a web3.eth.Contract function call into a method call that
// first constructs an unsigned transaction, before signing it and transmitting it to the blockchain
function constructMethodCall(method, address) {
    // the last member of 'args' defines transaction options, the rest are the function's input parameters
    const methodCall = async (...args) => {
        const { sender, privateKey, nonce } = args.slice(-1)[0];
        const params = args.slice(0, -1);
        console.log('sender = ', sender);
        console.log('to = ', address);
        console.log('data = ', method(...params).encodeABI());
        console.log('gas cost = ', new BN(await method(...params).estimateGas({ from: sender, to: address }), 10).toString(10));
        const transaction = new Tx({
            nonce: this.web3.utils.toHex(nonce),
            gas: new BN(await method(...params).estimateGas({ from: sender, to: address }), 10).add(new BN(100000)),
            gasPrice: new BN(this.web3.utils.toWei('5', 'gwei'), 10),
            data: method(...params).encodeABI(),
            from: sender,
            to: address,
        });
        transaction.sign(Buffer.from(privateKey.slice(2), 'hex'));
        return this.web3.eth.sendSignedTransaction(`0x${transaction.serialize().toString('hex')}`);
    };
    return methodCall;
}

// @dev Deployer is a pseudo-class that provides an interface to deploy AZTEC smart contracts to the blockchain
// and interact with them.
const Deployer = function Deployer(network) {
    if (network === 'development') {
        this.web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:9545'));
    } else if (network === 'rinkeby') {
        this.web3 = new Web3(new Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws'));
    } else if (network === 'mainnet') {
        this.web3 = new Web3(new Web3.providers.WebsocketProvider('wss://mainnet.infura.io/ws'));
    } else {
        throw new Error(`network ${network} not understood`);
    }

    this.network = network;

    this.aztec = {
        constructor: constructConstructorCall.bind(this)(AZTECInterface.abi, AZTEC.bytecode),
    };

    this.erc20 = {
        constructor: constructConstructorCall.bind(this)(ERC20Mintable.abi, ERC20Mintable.bytecode),
    };

    this.stopConditions = 3;
};

// @dev hacky workaround. We want this process to exit when we have done 3 things:
// 1: finished processing demo()
// 2: processed our expected Transfer events
// 3: processed our expected ConfidentialTransaction events
Deployer.prototype.checkStopConditions = function checkStopConditions() {
    this.stopConditions -= 1;
    if (this.stopConditions === 0) {
        this.web3.currentProvider.connection.close();
    }
};

Deployer.prototype.getTxCount = async function getTxCount(address) {
    return this.web3.eth.getTransactionCount(address);
};

// @dev helper method to give wallet enough gas to send transactions
Deployer.prototype.fundWallet = async function fundWallet(from = '', to = '', value = '') {
    let funder;
    if (!from && this.network === 'development') {
        ([funder] = await this.web3.eth.getAccounts());
    } else if (!from) {
        throw new Error('cannot fund from non-existent wallet');
    } else {
        funder = from;
    }
    return this.web3.eth.sendTransaction({
        from: funder,
        to,
        value: this.web3.utils.toWei(value, 'ether'),
    });
};

// @dev helper method to deploy AZTEC smart contracts to the blockchain
Deployer.prototype.createAZTECContracts = async function createAZTECContracts(aztecWallet) {
    const methodCall = constructMethodCall.bind(this);


    console.log('creating erc20 token');
    let tokenAddress;
    let tokenTxHash = '0x';
    let aztecAddress;
    let aztecTxHash = '0x';
    if (this.network === 'mainnet') {
        aztecAddress = '0xb729d78f799f62036a3b149e8d799bf109c214da';
        aztecTxHash = '0xd6cbbc44d212879ae697eb86ee9c82c05c3335334595d376f2cc768a61c24661';
        this.aztec = {
            ...this.aztec,
            address: aztecAddress,
            contract: new this.web3.eth.Contract(AZTECInterface.abi, aztecAddress),
        };


        tokenAddress = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359'; // makerDAO DAI contract
        const erc20Contract = new this.web3.eth.Contract(ERC20Mintable.abi, tokenAddress);
        const erc20Methods = Object
            .entries(erc20Contract.methods)
            .reduce((acc, [key, method]) => ({ ...acc, [key]: methodCall(method, tokenAddress) }), {});
        this.erc20 = {
            ...this.erc20,
            address: tokenAddress,
            contract: erc20Contract,
            methods: erc20Methods,
        };
    } else {
        console.log('creating aztec contract');
        const aztecResult = await this.aztec.constructor({
            sender: aztecWallet.wallet.issueKey.address,
            privateKey: aztecWallet.wallet.issueKey.privateKey,
            nonce: aztecWallet.wallet[this.network].nonce,
        });
        console.log('created aztec contract, address = ', aztecResult.contractAddress);
        aztecAddress = aztecResult.contractAddress;
        aztecTxHash = aztecResult.transactionHash;

        aztecWallet.increaseNonce(this.network);
        this.aztec = {
            ...this.aztec,
            address: aztecResult.contractAddress,
            contract: new this.web3.eth.Contract(AZTECInterface.abi, aztecResult.contractAddress),
        };


        const erc20Result = await this.erc20.constructor({
            sender: aztecWallet.wallet.issueKey.address,
            privateKey: aztecWallet.wallet.issueKey.privateKey,
            nonce: aztecWallet.wallet[this.network].nonce,
        });
        tokenAddress = erc20Result.contractAddress;
        tokenTxHash = erc20Result.transactionHash;
        aztecWallet.increaseNonce(this.network);
        const erc20Contract = new this.web3.eth.Contract(ERC20Mintable.abi, tokenAddress);
        const erc20Methods = Object
            .entries(erc20Contract.methods)
            .reduce((acc, [key, method]) => ({ ...acc, [key]: methodCall(method, tokenAddress) }), {});
        this.erc20 = {
            ...this.erc20,
            address: tokenAddress,
            contract: erc20Contract,
            methods: erc20Methods,
        };
    }


    let oldBytecode = AZTECERC20Bridge.bytecode;
    oldBytecode = oldBytecode.replace('__AZTECInterface________________________', aztecAddress.slice(2));
    AZTECERC20Bridge.bytecode = oldBytecode;
    this.aztecToken = {
        constructor: constructConstructorCall.bind(this)(AZTECERC20Bridge.abi, AZTECERC20Bridge.bytecode),
    };
    console.log('creating aztec token');
    const aztecTokenResult = await this.aztecToken.constructor(
        t2Formatted,
        tokenAddress,
        scalingFactor.toString(10),
        {
            sender: aztecWallet.wallet.issueKey.address,
            privateKey: aztecWallet.wallet.issueKey.privateKey,
            nonce: aztecWallet.wallet[this.network].nonce,
        }
    );
    aztecWallet.increaseNonce(this.network);
    console.log('created aztec token address = ', aztecTokenResult.contractAddress);
    const aztecTokenContract = new this.web3.eth.Contract(AZTECERC20Bridge.abi, aztecTokenResult.contractAddress);
    const aztecTokenMethods = Object
        .entries(aztecTokenContract.methods)
        .reduce((acc, [key, method]) => ({ ...acc, [key]: methodCall(method, aztecTokenResult.contractAddress) }), {});
    this.aztecToken = {
        ...this.aztecToken,
        address: aztecTokenResult.contractAddress,
        contract: aztecTokenContract,
        methods: aztecTokenMethods,
    };
    console.log('created contracts');
    console.log(this.aztec);
    console.log(this.aztecToken);
    return {
        erc20: {
            contractAddress: tokenAddress,
            transactionHash: tokenTxHash,
        },
        aztec: {
            contractAddress: aztecAddress,
            transactionHash: aztecTxHash,
        },
        aztecToken: {
            contractAddress: aztecTokenResult.contractAddress,
            transactionHash: aztecTokenResult.transactionHash,
        },
    };
};

// @dev helper method to construct method calls to already deployed AZTEC smart contracts
Deployer.prototype.attachAZTECContracts = async function attachAZTECContracts(aztecAddress, aztecTokenAddress, erc20Address) {
    const methodCall = constructMethodCall.bind(this);
    console.log('attaching aztec to ', aztecAddress);
    this.aztec = {
        ...this.aztec,
        address: aztecAddress,
        contract: new this.web3.eth.Contract(AZTECInterface.abi, aztecAddress),
    };

    const erc20Contract = new this.web3.eth.Contract(ERC20Mintable.abi, erc20Address);
    const erc20Methods = Object
        .entries(erc20Contract.methods)
        .reduce((acc, [key, method]) => ({ ...acc, [key]: methodCall(method, erc20Address) }), {});
    this.erc20 = {
        ...this.erc20,
        address: erc20Address,
        contract: erc20Contract,
        methods: erc20Methods,
    };

    const aztecTokenContract = new this.web3.eth.Contract(AZTECERC20Bridge.abi, aztecTokenAddress);
    const aztecTokenMethods = Object
        .entries(aztecTokenContract.methods)
        .reduce((acc, [key, method]) => ({ ...acc, [key]: methodCall(method, aztecTokenAddress) }), {});
    this.aztecToken = {
        ...this.aztecToken,
        address: aztecTokenAddress,
        contract: aztecTokenContract,
        methods: aztecTokenMethods,
    };
};

// @dev method to construct and send a join-split confidential transaction
Deployer.prototype.joinSplit = async function joinSplit(
    inputNotes,
    outputNotes,
    redeemValue,
    inputWallets,
    outputOwners,
    senderWallet,
    nonce
) {
    const m = inputNotes.length; // used in the AZTEC zero-knowledge proof
    let kPublic;
    if (redeemValue < 0) {
        // negative values of 'kPublic' represent converting public tokens into confidential notes.
        // 'negative' here is modulo the order of the bn128 generator group
        kPublic = GROUP_MODULUS.sub(new BN(-redeemValue));
    } else {
        // positive values represent redeeming tokens out of confidential notes
        kPublic = new BN(redeemValue);
    }

    // construct the AZTEC zero-knowledge proof
    console.log('m = ', m);
    console.log('kPublic = ', kPublic);
    console.log('notes = ', [...inputNotes, ...outputNotes]);
    const { proofData, challenge } = aztecProof.constructJoinSplit([...inputNotes, ...outputNotes], m, senderWallet.address, kPublic);
    console.log('proof data = ', proofData);
    console.log('challenge = ', challenge);
    // every input note owner must sign an ECDSA signature over the proof data, to attest that they approve of this transaction
    const signatures = inputNotes.map((note, index) => {
        const notePrivateKey = inputWallets[index].getNotePrivateKey(note.sharedSecretScalar);
        return sign.signNote(
            proofData[index],
            challenge,
            senderWallet.address,
            this.aztecToken.address,
            notePrivateKey
        ).signature;
    });

    // extract metadata used when note owners are defined via stealth addresses
    // let metadata = outputNotes.reduce((acc, c) => {
    //     return `${acc}${c.metadata.slice(2)}`;
    // }, '');
    // metadata = `0x${utils.toBytes32(new BN(outputNotes.length * 33, 10).toString(16))}${metadata}`;
    // and broadcast our transaction!
    const result = await this.aztecToken.methods.confidentialTransfer(
        proofData,
        m,
        challenge,
        signatures,
        outputOwners,
        '0x', {
            sender: senderWallet.address,
            privateKey: senderWallet.privateKey,
            nonce,
        }
    );
    return result;
};

// When we find a ConfidentialTransaction event, we want to construct a transaction transcript and log to a log file
Deployer.prototype.subscribeToEvents = function subscribeToEvents(
    wallets,
    expectedTransfers = -1,
    expectedConfidentialTransactions = -1
) {
    let transfers = 0;
    let confidentialTransfers = 0;
    const erc20Subscription = this.erc20.contract.events.Transfer();
    erc20Subscription.on('data', async (data) => {
        /* const { from, to, value } = data.returnValues;
        wallets.forEach((wallet) => { wallet.checkTokenTransfer(from, to, value, this.erc20.address, this.network); }); */
        console.log('token transfer transaction hash = ', data.transactionHash);
        if ((++transfers === expectedTransfers)) { this.checkStopConditions(); }
    });
    const aztecTokenSubscription = this.aztecToken.contract.events.ConfidentialTransfer();
    aztecTokenSubscription.on('data', async (data) => {
        // metadata contains the compressed ephemeral public keys used when
        // constructing stealth addresses for each note owner.
        // extract kPublic and metadata from log event
        /* const kPublic = data.returnValues[0];
        const metadata = this.web3.eth.abi.decodeParameter('bytes32[2][]', data.returnValues[1]);

        // decompress the ephemeral public keys
        const ephemeralKeys = metadata.map(([x, isOdd]) => {
            return secp256k1.curve.pointFromX(new BN(x.slice(2), 16), new BN(isOdd.slice(2), 16).isOdd());
        });

        // Recover the notes used in the transaction from the input data
        const transaction = await this.web3.eth.getTransaction(data.transactionHash);
        const transactionReceipt = await this.web3.eth.getTransactionReceipt(data.transactionHash);

        const inputData = transaction.input.slice(10);
        const decoded = this.web3.eth.abi.decodeParameters(
            ['bytes32[6][]', 'uint', 'uint', 'bytes32[3][]', 'address[]', 'bytes32[]'],
            inputData
        );
        const notes = decoded[0];
        const outputNoteOwners = decoded[4];
        const m = decoded[1];
        const challenge = decoded[2];
        const inputNotes = notes.slice(0, m);
        const outputNotes = notes.slice(m);

        // We want to figure out which wallet owns the notes in inputNotes and outputNotes,
        // so that we can update each wallet's note registry.
        // (obviously, for our demo we know the mapping between wallets and notes,
        // but it's good to validate that this can be determined using only public information and the wallet's scan key)
        wallets.forEach(wallet => wallet.checkForOwnedNotes(
            outputNotes,
            ephemeralKeys,
            outputNoteOwners,
            this.aztecToken.address,
            this.network
        ));
        wallets.forEach(wallet => wallet.checkForDestroyedNotes(inputNotes, this.aztecToken.address, this.network));

        // Recover the input note owners from the signatures transmitted in the transaction
        const inputNoteOwners = decoded[3].map((signature, i) => {
            return sign.recoverAddress(inputNotes[i], challenge, transaction.from, transaction.to, signature);
        });
        const { gasUsed } = transactionReceipt;
        const gasPrice = new BN(transaction.gasPrice, 10);
        // construct the transcript and write to a .json file
        const transcript = {
            type: 'ConfidentialTransaction',
            ethereumCost: this.web3.utils.fromWei(gasPrice.mul(new BN(gasUsed, 10))),
            transaction,
            transactionReceipt,
            createdNotes: inputNotes,
            destroyedNotes: outputNotes,
            kPublic,
            compressedEphemeralKeys: metadata,
            createdNoteOwners: outputNoteOwners,
            destroyedNoteOwners: inputNoteOwners,
        };
        fs.writeFileSync(`./transcripts/${this.network}/${data.transactionHash}.json`, JSON.stringify(transcript)); */
        console.log('confidential transaction hash = ', data.transactionHash);
        if (++confidentialTransfers === expectedConfidentialTransactions) { this.checkStopConditions(); }
    });
};

// module.exports = Deployer;

// @dev script that creates some example confidential transactions.
// We create an AZTECERC20Bridge smart contract and attach it to a standard ERC20 token smart contract.
// We then convert tokens into confidential notes, and trade confidential notes amongst several owners,
// before converting some notes back into token form
async function demo(config) {
    // mainWallet should be an account with enough ethereum to send these transactions.
    const deployer = new Deployer(config.network);

    const aztecWallets = [];
    aztecWallets[0] = new AZTECWallet(
        './testWallets/fundedWalletMainNet.json',
        '0xa53aa231dd33883ae1b45d1d81a73dd2f937fba44997d55f73d94bd876711fe6'
    );
    aztecWallets[1] = new AZTECWallet(
        './testWallets/fundedWallet1.json',
        '0x1b9bafc482c88c3223c3b7ea5b1104a086516f99136da96950bf8242f3389dfe'
    );
    for (let i = 0; i < 8; i += 1) {
        aztecWallets.push(new AZTECWallet(`./testWallets/testWallet${i}.json`));
    }
    const nonces = await Promise.all(aztecWallets.map(aztecWallet => deployer.getTxCount(aztecWallet.wallet.issueKey.address)));
    nonces.forEach((nonce, i) => { aztecWallets[i].setNonce(config.network, nonce); });
    // if network is development, pre-fund aztec wallets with some gas.
    if (config.network === 'development') {
        console.log('pre-funding AZTEC wallets');
        await Promise.all([
            deployer.fundWallet('', aztecWallets[0].wallet.issueKey.address, '1.066'),
            deployer.fundWallet('', aztecWallets[1].wallet.issueKey.address, '1.006'),
        ]);
    }

    if (!config.attach) {
        console.log('deploying AZTEC contracts');
        const contractData = await deployer.createAZTECContracts(aztecWallets[0]);
        fs.writeFileSync(`./transcripts/${config.network}/contracts.json`, JSON.stringify(contractData));
    } else {
        console.log('attaching AZTEC contracts');
        const contracts = JSON.parse(fs.readFileSync(`./transcripts/${config.network}/contracts.json`));
        console.log('contracts = ', contracts);
        await deployer.attachAZTECContracts(
            contracts.aztec.contractAddress,
            contracts.aztecToken.contractAddress,
            contracts.erc20.contractAddress
        );
    }

    // subscribe to events being emitted by our AZTECERC20Bridge.sol smart contract
    deployer.subscribeToEvents(aztecWallets, 3, 3);

    console.log('issuing public tokens');
    // some setup: give mint some tokens for mainWallet, and then approve AZTECERC20Bridge.sol
    if (config.network === 'development') {
        console.log('assuming network is development');
        await deployer.erc20.methods.mint(aztecWallets[0].wallet.issueKey.address, scalingFactor.mul(new BN(100000000)).toString(10), {
            sender: aztecWallets[0].wallet.issueKey.address,
            privateKey: aztecWallets[0].wallet.issueKey.privateKey,
            nonce: aztecWallets[0].wallet[config.network].nonce,
        });
        aztecWallets[0].increaseNonce(config.network);
    }
    // console.log('approving aztec contract for tokens');
    // console.log('erc20 address = ', deployer.erc20.address);
    // await deployer.erc20.methods.approve(deployer.aztecToken.address, scalingFactor.mul(new BN(400)).toString(10), {
    //     sender: aztecWallets[0].wallet.issueKey.address,
    //     privateKey: aztecWallets[0].wallet.issueKey.privateKey,
    //     nonce: aztecWallets[0].wallet[config.network].nonce,
    // });
    // aztecWallets[0].increaseNonce(config.network);


    // console.log('binding tokens into 4 AZTEC notes');
    // // send a join-split transaction that takes 30,000 tokens and converts into four confidential notes
    // const firstCommitments = await Promise.all([
    //     aztecWallets[0].generateNote(aztecWallets[0].wallet, 100),
    //     aztecWallets[0].generateNote(aztecWallets[0].wallet, 100),
    //     aztecWallets[0].generateNote(aztecWallets[1].wallet, 100),
    //     aztecWallets[0].generateNote(aztecWallets[1].wallet, 100),
    // ]);

    // const processedCommitments = firstCommitments.map(({
    //     k,
    //     a,
    //     gamma,
    //     sigma,
    //     ...rest
    // }) => {
    //     return {
    //         k: `0x${toBytes32(k.toString(16))}`,
    //         a: `0x${toBytes32(a.toString(16))}`,
    //         gamma: {
    //             x: `0x${toBytes32(gamma.x.fromRed().toString(16))}`,
    //             y: `0x${toBytes32(gamma.y.fromRed().toString(16))}`,
    //         },
    //         sigma: {
    //             x: `0x${toBytes32(sigma.x.fromRed().toString(16))}`,
    //             y: `0x${toBytes32(sigma.y.fromRed().toString(16))}`,
    //         },
    //         ...rest,
    //     };
    // });
    // console.log('processed commitments = ', JSON.stringify(processedCommitments));
    // fs.writeFileSync('processedCommitmentsA.json', JSON.stringify(processedCommitments));
    // console.log('first commitments = ', JSON.stringify(firstCommitments));
    // fs.writeFileSync('unprocessedCommitments.json', JSON.stringify(firstCommitments));
    // await deployer.joinSplit(
    //     [],
    //     firstCommitments,
    //     -400,
    //     [],
    //     firstCommitments.map(c => c.ownerAddress),
    //     aztecWallets[0].wallet.issueKey,
    //     aztecWallets[0].wallet[config.network].nonce
    // );
    // aztecWallets[0].increaseNonce(config.network);
    /*
    console.log('issuing a two-input:two-output join-split transaction'); */


    // ####### SENDING DAI
    console.log('sending dai');
    // const joe = JSON.parse(fs.readFileSync('companyWallets/joe.json', 'utf8'));
    const tom = JSON.parse(fs.readFileSync('companyWallets/oldTom.json', 'utf8'));
    // const arnaud = JSON.parse(fs.readFileSync('companyWallets/arnaud.json', 'utf8'));
    // const leila = JSON.parse(fs.readFileSync('companyWallets/leila.json', 'utf8'));

    // const owners = [
    //     arnaud.address,
    //     leila.address,
    // ];
    console.log('view key = ', tom.viewKey);
    const outputCommitments = await Promise.all([
        aztecProof.constructCommitment(100, tom.viewKey),
   //     aztecProof.constructCommitment(50, tom.viewKey),
    ]);

    function parseCommitment({ k, a, gamma, sigma, ...rest }) {
        return {
            k: `0x${toBytes32(k.toString(16))}`,
            a: `0x${toBytes32(a.toString(16))}`,
            gamma: {
                x: `0x${toBytes32(gamma.x.fromRed().toString(16))}`,
                y: `0x${toBytes32(gamma.y.fromRed().toString(16))}`,
            },
            sigma: {
                x: `0x${toBytes32(sigma.x.fromRed().toString(16))}`,
                y: `0x${toBytes32(sigma.y.fromRed().toString(16))}`,
            },
            ...rest,
        };
    }
    // arnaud.notes = arnaud.notes || [];
    // arnaud.notes.push(parseCommitment(outputCommitments[0]));
    tom.notes = [];
    tom.notes.push(parseCommitment(outputCommitments[0]));
   // tom.notes.push(parseCommitment(outputCommitments[1]));

    console.log('commitments = ', JSON.stringify(outputCommitments));
    const potentialInputs = JSON.parse(fs.readFileSync('unprocessedCommitments.json'))
        .map(({
            gamma,
            sigma,
            k,
            a,
            ...rest
        }) => {
            return {
                gamma: bn128.point(new BN(gamma[0], 16).forceRed(bn128.red), new BN(gamma[1], 16).forceRed(bn128.red)),
                sigma: bn128.point(new BN(sigma[0], 16).forceRed(bn128.red), new BN(sigma[1], 16).forceRed(bn128.red)),
                k: new BN(k, 16).toRed(bn128.groupReduction),
                a: new BN(a, 16).toRed(bn128.groupReduction),
                ...rest,
            };
        });
    const inputCommitments = [potentialInputs[3]];
    console.log('making join split');
    fs.writeFileSync('./companyWallets/oldTom.json', JSON.stringify(tom));
        console.log(inputCommitments);
    nonces.forEach((nonce, i) => { aztecWallets[i].setNonce(config.network, nonce); });
        console.log(inputCommitments.length);
    await deployer.joinSplit(
        inputCommitments,
        outputCommitments,
        0,
        [aztecWallets[1]],
        [tom.address],
        aztecWallets[1].wallet.issueKey,
        aztecWallets[1].wallet[config.network].nonce
    );
    /*
    console.log(outputCommitments);
    console.log('redeeming notes');
    await deployer.joinSplit(
        outputCommitments,
        [],
        30000,
        [aztecWallets[0], aztecWallets[0], aztecWallets[2], aztecWallets[1]],
        [],
        aztecWallets[0].wallet.issueKey,
        aztecWallets[0].wallet[config.network].nonce
    );
    aztecWallets[0].increaseNonce(config.network);
    deployer.checkStopConditions(); */

    // ### END RECOVERY


    // send a join-split transaction that converts two of aztecWallets[0]'s notes
    // into a note owned by aztecWallets[0] and one owned by aztecWallets[3]
    // const secondCommitments = await Promise.all([
    //     aztecWallets[0].generateNote(aztecWallets[1].wallet, 5000),
    //     aztecWallets[0].generateNote(aztecWallets[0].wallet, 6000),
    // ]);
    // await deployer.joinSplit(
    //     [firstCommitments[0], firstCommitments[1]],
    //     secondCommitments,
    //     0,
    //     [aztecWallets[0], aztecWallets[0]],
    //     secondCommitments.map(c => c.ownerAddress),
    //     aztecWallets[0].wallet.issueKey,
    //     aztecWallets[0].wallet[config.network].nonce
    // );
    // aztecWallets[0].increaseNonce(config.network);

    // console.log('converting from confidential notes to public tokens');
    //     const potentialInputs = JSON.parse(fs.readFileSync('unprocessedCommitments.json'))
    //     .map(({
    //         gamma,
    //         sigma,
    //         k,
    //         a,
    //         ...rest
    //     }) => {
    //         return {
    //             gamma: bn128.point(new BN(gamma[0], 16).forceRed(bn128.red), new BN(gamma[1], 16).forceRed(bn128.red)),
    //             sigma: bn128.point(new BN(sigma[0], 16).forceRed(bn128.red), new BN(sigma[1], 16).forceRed(bn128.red)),
    //             k: new BN(k, 16).toRed(bn128.groupReduction),
    //             a: new BN(a, 16).toRed(bn128.groupReduction),
    //             ...rest,
    //         };
    //     });
    // // send a join-split transaction that converts two of aztecWallet[3]'s notes into public tokens
    // await deployer.joinSplit(
    //     [potentialInputs[2]],
    //     [],
    //     100,
    //     [aztecWallets[1]],
    //     [],
    //     aztecWallets[1].wallet.issueKey,
    //     aztecWallets[1].wallet[config.network].nonce
    // );
    // aztecWallets[1].increaseNonce(config.network);
    deployer.checkStopConditions();
}

async function makeCompanyWallets() {
    const oldTom = {
        viewKey: `0x${toBytes32(new BN(crypto.randomBytes(32), 16).umod(GROUP_MODULUS).toString(16))}`,
        address: '0x29272c132e892572b2a8877d13262af0b33a71c9',
    };

    // const arnaud = {
    //     viewKey: new BN(crypto.randomBytes(32), 16).umod(GROUP_MODULUS).toString(16),
    //     address: '0xD600aEf386b14745C4d2b632A0e4F907288bb5E3',
    // };

    // const tom = {
    //     viewKey: new BN(crypto.randomBytes(32), 16).umod(GROUP_MODULUS).toString(16),
    //     address: '0xbD05c992C1A36E83f578cC37d4748B860d4469CC',
    // };

    // const leila = {
    //     viewKey: new BN(crypto.randomBytes(32), 16).umod(GROUP_MODULUS).toString(16),
    //     address: '0xD3C45F696D335508B2f39dD093c237143BaC9526',
    // };

    // fs.writeFileSync('companyWallets/joe.json', JSON.stringify(joe));
    // fs.writeFileSync('companyWallets/arnaud.json', JSON.stringify(arnaud));
    fs.writeFileSync('companyWallets/oldTom.json', JSON.stringify(oldTom));
    // fs.writeFileSync('companyWallets/leila.json', JSON.stringify(leila));
}


const defaultConfig = {
    network: 'development',
    attach: false,
};
let configuration = { ...defaultConfig };
const args = JSON.parse(process.env.npm_config_argv).original.slice(2);
if (args.indexOf('--network') !== -1) {
    const i = args.indexOf('--network');
    const network = args.length > (i + 1) ? args[i + 1] : defaultConfig.network;
    configuration = {
        ...configuration,
        network,
    };
}
if (args.indexOf('--attach') !== -1) {
    const i = args.indexOf('--attach');
    const attach = args.length > (i + 1) ? args[i + 1] === 'true' : defaultConfig.attach;
    configuration = {
        ...configuration,
        attach,
    };
}

// demo(configuration);
// makeCompanyWallets().then(() => {});