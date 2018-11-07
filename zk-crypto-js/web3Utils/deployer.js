const Web3 = require('web3');
const Tx = require('ethereumjs-tx');
const Elliptic = require('elliptic');
const fs = require('fs');
const BN = require('bn.js');

const aztecProof = require('../proof/proof');
const ecdsa = require('../secp256k1/ecdsa');
const sign = require('../utils/sign');
const AZTEC = require('../../build/contracts/AZTEC.json');
const AZTECToken = require('../../build/contracts/AZTECToken.json');
const AZTECInterface = require('../../build/contracts/AZTECInterface.json');
const { t2Formatted, GROUP_MODULUS } = require('../../zk-crypto-js/params');
const AZTECWallet = require('../wallet/wallet');

// eslint-disable-next-line new-cap
const secp256k1 = new Elliptic.ec('secp256k1');

// @dev helper method to turn a web3.eth.Contract constructor call into a method call that
// first constructs an unsigned transaction, before signing it and transmitting it to the blockchain
function constructConstructorCall(abi, bytecode) {
    const constructorCall = async (...args) => {
        const options = args.slice(-1)[0];
        const params = args.slice(0, -1);
        const deployBase = new this.web3.eth.Contract(abi).deploy({
            data: bytecode,
            arguments: params,
        });
        const txBytecode = deployBase.encodeABI();
        const gasEstimate = await deployBase.estimateGas({
            from: options.sender,
        });
        const txCount = await this.web3.eth.getTransactionCount(options.sender);
        const txData = {
            nonce: this.web3.utils.toHex(txCount),
            gasLimit: this.web3.utils.toHex(gasEstimate),
            gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('10', 'gwei')),
            data: txBytecode,
            from: options.sender,
        };
        const transaction = new Tx(txData);
        transaction.sign(Buffer.from(options.privateKey.slice(2), 'hex'));

        const serializedTx = transaction.serialize().toString('hex');
        const result = await this.web3.eth.sendSignedTransaction(`0x${serializedTx}`);
        return result;
    };
    return constructorCall;
}

// @dev helper method to turn a web3.eth.Contract function call into a method call that
// first constructs an unsigned transaction, before signing it and transmitting it to the blockchain
function constructMethodCall(method, address) {
    // the last member of 'args' defines transaction options, the rest are the function's input parameters
    const methodCall = async (...args) => {
        const options = args.slice(-1)[0];
        const params = args.slice(0, -1);
        const txBytecode = method(...params).encodeABI();
        const gasEstimate = await method(...params).estimateGas({
            from: options.sender,
            to: address,
        });
        const txCount = await this.web3.eth.getTransactionCount(options.sender);
        const txData = {
            nonce: this.web3.utils.toHex(txCount),
            gasLimit: this.web3.utils.toHex(gasEstimate),
            gasPrice: this.web3.utils.toHex(this.web3.utils.toWei('10', 'gwei')),
            data: txBytecode,
            from: options.sender,
            to: address,
        };
        const transaction = new Tx(txData);
        transaction.sign(Buffer.from(options.privateKey.slice(2), 'hex'));

        const serializedTx = transaction.serialize().toString('hex');
        const result = await this.web3.eth.sendSignedTransaction(`0x${serializedTx}`);
        return result;
    };
    return methodCall;
}

// @dev Deployer is a pseudo-class that provides an interface to deploy AZTEC smart contracts to the blockchain
// and interact with them.
const Deployer = function Deployer(network, aztecWallets, ethereumWallets) {
    if (network === 'development') {
        this.web3 = new Web3(new Web3.providers.WebsocketProvider('ws://localhost:9545'));
    } else if (network === 'rinkeby') {
        this.web3 = new Web3(new Web3.providers.WebsocketProvider('wss://rinkeby.infura.io/ws'));
    }
    this.aztecWallets = { ...aztecWallets };
    this.network = network;
    this.ethereumWallets = [...ethereumWallets];
    this.aztec = {
        constructor: constructConstructorCall.bind(this)(AZTECInterface.abi, AZTEC.bytecode),
    };
    this.aztecToken = {
        constructor: constructConstructorCall.bind(this)(AZTECToken.abi, AZTECToken.bytecode),
    };
};

// @dev helper method to deploy AZTEC smart contracts to the blockchain
Deployer.prototype.createAZTECContracts = async function createAZTECContracts(wallet) {
    if (this.network === 'development') {
        // if we're using ganache, our main wallet won't have any funds,
        // send it some ether so we have enough gas to broadcast transactions
        const accounts = await this.web3.eth.getAccounts();

        const transactions = this.ethereumWallets.map((ethereumWallet) => {
            return this.web3.eth.sendTransaction({
                to: ethereumWallet.address,
                from: accounts[0],
                value: this.web3.utils.toHex(this.web3.utils.toWei('1', 'ether')),
            });
        });
        await Promise.all(transactions);
    }
    const aztecResult = await this.aztec.constructor({ sender: wallet.address, privateKey: wallet.privateKey });

    this.aztec = {
        ...this.aztec,
        address: aztecResult.contractAddress,
        contract: new this.web3.eth.Contract(AZTECInterface.abi, aztecResult.contractAddress),
    };

    const aztecTokenResult = await this.aztecToken.constructor(
        t2Formatted,
        aztecResult.contractAddress,
        { sender: wallet.address, privateKey: wallet.privateKey }
    );
    const contract = new this.web3.eth.Contract(AZTECToken.abi, aztecTokenResult.contractAddress);
    const methodCall = constructMethodCall.bind(this);
    const methods = Object
        .entries(contract.methods)
        .reduce((acc, [key, method]) => ({ ...acc, [key]: methodCall(method, aztecTokenResult.contractAddress) }), {});
    this.aztecToken = {
        ...this.aztecToken,
        address: aztecTokenResult.contractAddress,
        contract,
        methods,
    };
};

// @dev helper method to construct method calls to already deployed AZTEC smart contracts
Deployer.prototype.attachAZTECContracts = async function attachAZTECContracts(aztecAddress, aztecTokenAddress) {
    if (this.network === 'development') {
        const accounts = await this.web3.eth.getAccounts();

        const transactions = this.ethereumWallets.map((ethereumWallet) => {
            return this.web3.eth.sendTransaction({
                to: ethereumWallet.address,
                from: accounts[0],
                value: this.web3.utils.toHex(this.web3.utils.toWei('1', 'ether')),
            });
        });
        await Promise.all(transactions);
    }
    this.aztec = {
        ...this.aztec,
        address: aztecAddress,
        contract: new this.web3.eth.Contract(AZTECInterface.abi, aztecAddress),
    };
    const contract = new this.web3.eth.Contract(AZTECToken.abi, aztecTokenAddress);
    const methodCall = constructMethodCall.bind(this);
    const methods = Object
        .entries(contract.methods)
        .reduce((acc, [key, method]) => ({ ...acc, [key]: methodCall(method, aztecTokenAddress) }), {});
    this.aztecToken = {
        ...this.aztecToken,
        address: aztecTokenAddress,
        contract,
        methods,
    };
};

// @dev method to construct and send a join-split confidential transaction
Deployer.prototype.joinSplit = async function joinSplit(
    inputNotes,
    outputNotes,
    redeemValue,
    inputWallets,
    outputOwners,
    senderWallet
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
    const { proofData, challenge } = aztecProof.constructJoinSplit([...inputNotes, ...outputNotes], m, kPublic);

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
    const metadata = outputNotes.map(c => c.metadata);

    // and broadcast our transaction!
    const result = await this.aztecToken.methods.confidentialTransaction(
        proofData,
        m,
        challenge,
        signatures,
        outputOwners,
        metadata, {
            sender: senderWallet.address,
            privateKey: senderWallet.privateKey,
        }
    );
    return result;
};

// When we find a ConfidentialTransaction event, we want to construct a transaction transcript and log to a log file
Deployer.prototype.subscribeToEvents = function subscribeToEvents(wallets) {
    this.aztecToken
        .contract
        .events
        .ConfidentialTransaction()
        .on('data', async (data) => {
            // metadata contains the compressed ephemeral public keys used when
            // constructing stealth addresses for each note owner.
            // extract kPublic and metadata from log event
            const kPublic = data.returnValues[0];
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
            wallets.forEach(wallet => wallet.checkForOwnedNotes(outputNotes, ephemeralKeys, outputNoteOwners));
            wallets.forEach(wallet => wallet.checkForDestroyedNotes(inputNotes));

            // Recover the input note owners from the signatures transmitted in the transaction
            const inputNoteOwners = decoded[3].map((signature, i) => {
                return sign.recoverAddress(inputNotes[i], challenge, transaction.from, transaction.to, signature);
            });

            // Finally, construct the transcript and write to a .json file
            const transcript = {
                type: 'ConfidentialTransaction',
                transaction,
                transactionReceipt,
                createdNotes: inputNotes,
                destroyedNotes: outputNotes,
                kPublic,
                compressedEphemeralKeys: metadata,
                createdNoteOwners: outputNoteOwners,
                destroyedNoteOwners: inputNoteOwners,
            };
            fs.writeFileSync(`./transcripts/${this.network}/${data.transactionHash}.json`, JSON.stringify(transcript));
        });
};

module.exports = Deployer;

// @dev demo script to deploy an AZTEC.sol, AZTECERC20Bridge.sol and ERC20Mintable.sol smart contract
async function deploy() {
    const mainWallet = ecdsa.keyPairFromPrivate('0xa5c9dede5aba72f88f6abf01ea768d78ad7c3bcfbf29d60bd46a829690bf7791');
    const deployer = new Deployer('development', {}, [mainWallet]);
    await deployer.createAZTECContracts(mainWallet);
    return {
        aztec: deployer.aztec.address,
        aztecToken: deployer.aztecToken.address,
    };
}

// @dev script that creates some example confidential transactions.
// We create an AZTECERC20Bridge smart contract and attach it to a standard ERC20 token smart contract.
// We then convert tokens into confidential notes, and trade confidential notes amongst several owners,
// before converting some notes back into token form
async function demo() {
    // mainWallet should be an account with enough ethereum to send these transactions.
    const mainWallet = ecdsa.keyPairFromPrivate('0xa5c9dede5aba72f88f6abf01ea768d78ad7c3bcfbf29d60bd46a829690bf7791');
    const deployer = new Deployer('development', {}, [mainWallet]);

    // deploy the AZTEC.sol, AZTECERC20Bridge.sol and ERC20Mintable.sol smart contracts
    const { aztec, aztecToken } = await deploy();
    const aztecWallets = [];
    for (let i = 0; i < 10; i += 1) {
        aztecWallets.push(new AZTECWallet(`testWallet${i}.json`));
    }
    await deployer.attachAZTECContracts(aztec, aztecToken);

    // subscribe to events being emitted by our AZTECERC20Bridge.sol smart contract
    deployer.subscribeToEvents(aztecWallets);

    // some setup: give mint some tokens for mainWallet, and then approve AZTECERC20Bridge.sol
    await deployer.aztecToken.methods.mint(deployer.ethereumWallets[0].address, 1000000, {
        sender: deployer.ethereumWallets[0].address,
        privateKey: deployer.ethereumWallets[0].privateKey,
    });
    await deployer.aztecToken.methods.approve(deployer.aztecToken.address, 1000000, {
        sender: deployer.ethereumWallets[0].address,
        privateKey: deployer.ethereumWallets[0].privateKey,
    });

    // send a join-split transaction that takes 30,000 tokens and converts into five confidential notes
    const firstCommitments = await Promise.all([
        aztecWallets[0].generateNote(aztecWallets[0].wallet, 9000),
        aztecWallets[0].generateNote(aztecWallets[0].wallet, 2000),
        aztecWallets[0].generateNote(aztecWallets[2].wallet, 11000),
        aztecWallets[0].generateNote(aztecWallets[3].wallet, 8000),
    ]);
    await deployer.joinSplit(
        [],
        firstCommitments,
        -30000,
        [],
        firstCommitments.map(c => c.ownerAddress),
        mainWallet
    );

    // send a join-split transaction that converts two of aztecWallets[0]'s notes
    // into a note owned by aztecWallets[0] and one owned by aztecWallets[3]
    const secondCommitments = await Promise.all([
        aztecWallets[0].generateNote(aztecWallets[3].wallet, 5000),
        aztecWallets[0].generateNote(aztecWallets[0].wallet, 6000),
    ]);
    await deployer.joinSplit(
        [firstCommitments[0], firstCommitments[1]],
        secondCommitments,
        0,
        [aztecWallets[0], aztecWallets[0]],
        secondCommitments.map(c => c.ownerAddress),
        mainWallet
    );

    // send a join-split transaction that converts two of aztecWallet[3]'s notes into public tokens
    await deployer.joinSplit(
        [firstCommitments[3], secondCommitments[0]],
        [],
        13000,
        [aztecWallets[3], aztecWallets[3]],
        [],
        mainWallet
    );
}

demo().then(() => {});
