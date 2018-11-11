/* eslint-disable no-plusplus */
const Web3 = require('web3');
const Tx = require('ethereumjs-tx');
const fs = require('fs');
const BN = require('bn.js');

const AZTEC = require('../../build/contracts/AZTEC.json');
const AZTECToken = require('../../build/contracts/AZTECToken.json');
const AZTECERC20Bridge = require('../../build/contracts/AZTECERC20Bridge.json');
const AZTECInterface = require('../../build/contracts/AZTECInterface.json');
const ERC20Mintable = require('../../build/contracts/ERC20Mintable.json');

const aztecProof = require('../proof/proof');
const sign = require('../utils/sign');
const utils = require('../utils/utils');
const AZTECWallet = require('../wallet/wallet');
const { t2Formatted, GROUP_MODULUS } = require('../params');

// @dev helper method to turn a web3.eth.Contract constructor call into a method call that
// first constructs an unsigned transaction, before signing it and transmitting it to the blockchain
function constructConstructorCall(abi, bytecode) {
    const constructorCall = async (...args) => {
        const { sender, privateKey, nonce } = args.slice(-1)[0];
        const params = args.slice(0, -1);    
        const deployBase = new this.web3.eth.Contract(abi).deploy({ data: bytecode, arguments: params });
        const transaction = new Tx({
            nonce: this.web3.utils.toHex(nonce),
            gas: new BN(await deployBase.estimateGas({ from: sender }), 10),
            gasPrice: new BN(this.web3.utils.toWei('3.5', 'gwei'), 10),
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
        const transaction = new Tx({
            nonce: this.web3.utils.toHex(nonce),
            gas: new BN(await method(...params).estimateGas({ from: sender, to: address }), 10),
            gasPrice: new BN(this.web3.utils.toWei('3.1', 'gwei'), 10),
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

    console.log('creating aztec contract');
    const aztecResult = await this.aztec.constructor({
        sender: aztecWallet.wallet.issueKey.address,
        privateKey: aztecWallet.wallet.issueKey.privateKey,
        nonce: aztecWallet.wallet[this.network].nonce,
    });
    aztecWallet.increaseNonce(this.network);
    this.aztec = {
        ...this.aztec,
        address: aztecResult.contractAddress,
        contract: new this.web3.eth.Contract(AZTECInterface.abi, aztecResult.contractAddress),
    };
    console.log('creating erc20 token');
    const erc20Result = await this.erc20.constructor({
        sender: aztecWallet.wallet.issueKey.address,
        privateKey: aztecWallet.wallet.issueKey.privateKey,
        nonce: aztecWallet.wallet[this.network].nonce,
    });
    aztecWallet.increaseNonce(this.network);
    const erc20Contract = new this.web3.eth.Contract(ERC20Mintable.abi, erc20Result.contractAddress);
    const erc20Methods = Object
        .entries(erc20Contract.methods)
        .reduce((acc, [key, method]) => ({ ...acc, [key]: methodCall(method, erc20Result.contractAddress) }), {});
    this.erc20 = {
        ...this.erc20,
        address: erc20Result.contractAddress,
        contract: erc20Contract,
        methods: erc20Methods,
    };

    let oldBytecode = AZTECERC20Bridge.bytecode;
    oldBytecode = oldBytecode.replace('__AZTECInterface________________________', aztecResult.contractAddress.slice(2));
    AZTECERC20Bridge.bytecode = oldBytecode;
    this.aztecToken = {
        constructor: constructConstructorCall.bind(this)(AZTECERC20Bridge.abi, AZTECERC20Bridge.bytecode),
    };

    const aztecTokenResult = await this.aztecToken.constructor(
        t2Formatted,
        erc20Result.contractAddress,
        {
            sender: aztecWallet.wallet.issueKey.address,
            privateKey: aztecWallet.wallet.issueKey.privateKey,
            nonce: aztecWallet.wallet[this.network].nonce,
        }
    );
    aztecWallet.increaseNonce(this.network);

    const aztecTokenContract = new this.web3.eth.Contract(AZTECToken.abi, aztecTokenResult.contractAddress);
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
    return {
        erc20: {
            contractAddress: erc20Result.contractAddress,
            transactionHash: erc20Result.transactionHash,
        },
        aztec: {
            contractAddress: aztecResult.contractAddress,
            transactionHash: aztecResult.transactionHash,
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

    const aztecTokenContract = new this.web3.eth.Contract(AZTECToken.abi, aztecTokenAddress);
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
    const { proofData, challenge } = aztecProof.constructJoinSplit([...inputNotes, ...outputNotes], m, senderWallet.address, kPublic);

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
    let metadata = outputNotes.reduce((acc, c) => {
        return `${acc}${c.metadata.slice(2)}`;
    }, '');
    metadata = `0x${utils.toBytes32(new BN(outputNotes.length * 33, 10).toString(16))}${metadata}`;
    // and broadcast our transaction!
    console.log('metadata = ', metadata);
    const result = await this.aztecToken.methods.confidentialTransaction(
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
    let confidentialTransactions = 0;
    const erc20Subscription = this.erc20.contract.events.Transfer();
    erc20Subscription.on('data', async (data) => {
        /* const { from, to, value } = data.returnValues;
        wallets.forEach((wallet) => { wallet.checkTokenTransfer(from, to, value, this.erc20.address, this.network); }); */
        console.log('token transfer transaction hash = ', data.transactionHash);
        if ((++transfers === expectedTransfers)) { this.checkStopConditions(); }
    });
    const aztecTokenSubscription = this.aztecToken.contract.events.ConfidentialTransaction();
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
        if (++confidentialTransactions === expectedConfidentialTransactions) { this.checkStopConditions(); }
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
        './testWallets/fundedWallet0.json',
        '0xa5c9dede5aba72f88f6abf01ea768d78ad7c3bcfbf29d60bd46a829690bf7791'
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
            deployer.fundWallet('', aztecWallets[0].wallet.issueKey.address, '0.056'),
            deployer.fundWallet('', aztecWallets[1].wallet.issueKey.address, '0.004'),
        ]);
    }

    if (!config.attach) {
        console.log('deploying AZTEC contracts');
        const contractData = await deployer.createAZTECContracts(aztecWallets[0]);
        fs.writeFileSync(`./transcripts/${config.network}/contracts.json`, JSON.stringify(contractData));
    } else {
        console.log('attaching AZTEC contracts');
        const contracts = JSON.parse(fs.readFileSync(`./transcripts/${config.network}/contracts.json`));
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
    await deployer.erc20.methods.mint(aztecWallets[0].wallet.issueKey.address, 1000000, {
        sender: aztecWallets[0].wallet.issueKey.address,
        privateKey: aztecWallets[0].wallet.issueKey.privateKey,
        nonce: aztecWallets[0].wallet[config.network].nonce,
    });
    aztecWallets[0].increaseNonce(config.network);
    console.log('approving aztec contract for tokens');
    await deployer.erc20.methods.approve(deployer.aztecToken.address, 1000000, {
        sender: aztecWallets[0].wallet.issueKey.address,
        privateKey: aztecWallets[0].wallet.issueKey.privateKey,
        nonce: aztecWallets[0].wallet[config.network].nonce,
    });
    aztecWallets[0].increaseNonce(config.network);

    console.log('binding tokens into 4 AZTEC notes');
    // send a join-split transaction that takes 30,000 tokens and converts into four confidential notes
    const firstCommitments = await Promise.all([
        aztecWallets[0].generateNote(aztecWallets[0].wallet, 9000),
        aztecWallets[0].generateNote(aztecWallets[0].wallet, 2000),
        aztecWallets[0].generateNote(aztecWallets[2].wallet, 11000),
        aztecWallets[0].generateNote(aztecWallets[1].wallet, 8000),
    ]);
    await deployer.joinSplit(
        [],
        firstCommitments,
        -30000,
        [],
        firstCommitments.map(c => c.ownerAddress),
        aztecWallets[0].wallet.issueKey,
        aztecWallets[0].wallet[config.network].nonce
    );
    aztecWallets[0].increaseNonce(config.network);
    fs.writeFile('firstCommitments.json', JSON.stringify(firstCommitments));
    console.log('issuing a two-input:two-output join-split transaction');
    // send a join-split transaction that converts two of aztecWallets[0]'s notes
    // into a note owned by aztecWallets[0] and one owned by aztecWallets[3]
    const secondCommitments = await Promise.all([
        aztecWallets[0].generateNote(aztecWallets[1].wallet, 5000),
        aztecWallets[0].generateNote(aztecWallets[0].wallet, 6000),
    ]);
    await deployer.joinSplit(
        [firstCommitments[0], firstCommitments[1]],
        secondCommitments,
        0,
        [aztecWallets[0], aztecWallets[0]],
        secondCommitments.map(c => c.ownerAddress),
        aztecWallets[0].wallet.issueKey,
        aztecWallets[0].wallet[config.network].nonce
    );
    aztecWallets[0].increaseNonce(config.network);

    console.log('converting from confidential notes to public tokens');
    // send a join-split transaction that converts two of aztecWallet[3]'s notes into public tokens
    await deployer.joinSplit(
        [firstCommitments[3], secondCommitments[0]],
        [],
        13000,
        [aztecWallets[1], aztecWallets[1]],
        [],
        aztecWallets[1].wallet.issueKey,
        aztecWallets[1].wallet[config.network].nonce
    );
    aztecWallets[1].increaseNonce(config.network);
    deployer.checkStopConditions();
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

demo(configuration);
