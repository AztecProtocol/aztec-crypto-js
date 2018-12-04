const fs = require('fs');
const web3Utils = require('web3-utils');
const BN = require('bn.js');

const bn128 = require('../bn128/bn128');
const ecdsa = require('../secp256k1/ecdsa');
const secp256k1 = require('../secp256k1/secp256k1');
const proof = require('../proof/proof');
const { toBytes32 } = require('../utils/utils');


function createWallet(path, privateKey = null) {
    let issueKey;
    if (privateKey) {
        issueKey = ecdsa.keyPairFromPrivate(privateKey);
    } else {
        issueKey = ecdsa.generateKeyPair();
    }
    const scanKey = ecdsa.generateKeyPair();
    const wallet = {
        path,
        scanKey: {
            address: scanKey.address,
            publicKey: {
                x: scanKey.publicKey.x.fromRed(),
                y: scanKey.publicKey.y.fromRed(),
            },
            privateKey: scanKey.privateKey,
        },
        issueKey: {
            address: issueKey.address,
            publicKey: {
                x: issueKey.publicKey.x.fromRed(),
                y: issueKey.publicKey.y.fromRed(),
            },
            privateKey: issueKey.privateKey,
        },
        rinkeby: {
            nonce: 0,
        },
        development: {
            nonce: 0,
        },
        mainnet: {
            nonce: 0,
        },
    };
    fs.writeFileSync(path, JSON.stringify(wallet));
    return wallet;
}

function createNoteHash(gamma, sigma) {
    const gammaString = `${toBytes32(gamma.x.fromRed().toString(16))}${toBytes32(gamma.y.fromRed().toString(16))}`;
    const sigmaString = `${toBytes32(sigma.x.fromRed().toString(16))}${toBytes32(sigma.y.fromRed().toString(16))}`;
    return web3Utils.sha3(`0x${gammaString}${sigmaString}`, 'hex');
}

const Wallet = function Wallet(path, privateKey = null) {
    const exists = fs.existsSync(path);
    if (exists) {
        console.log('loading wallet from path');
        this.wallet = JSON.parse(fs.readFileSync(`${path}`));
    } else {
        this.wallet = createWallet(path, privateKey);
    }
};

Wallet.prototype.setNonce = async function setNonce(network, nonce) {
    const networkWallet = this.wallet[network] || {};
    this.wallet = {
        ...this.wallet,
        [network]: {
            ...networkWallet,
            nonce,
        },
    };
    fs.writeFileSync(this.wallet.path, JSON.stringify(this.wallet));
};

Wallet.prototype.increaseNonce = function increaseNonce(network) {
    const networkWallet = this.wallet[network] || {};
    const oldNonce = networkWallet.nonce || 0;
    this.wallet = {
        ...this.wallet,
        [network]: {
            ...networkWallet,
            nonce: oldNonce + 1,
        },
    };
    fs.writeFileSync(this.wallet.path, JSON.stringify(this.wallet));
};

Wallet.prototype.generateNote = async function generateNote(recipient, value) {
    const ephemeralKey = ecdsa.generateKeyPair();

    const sharedSecret = secp256k1.curve
        .point(recipient.scanKey.publicKey.x, recipient.scanKey.publicKey.y)
        .mul(Buffer.from(ephemeralKey.privateKey.slice(2), 'hex'));

    const sharedSecretScalar = web3Utils.sha3(
        `0x${toBytes32(sharedSecret.x.fromRed().toString(16))}${toBytes32(sharedSecret.y.fromRed().toString(16))}`,
        'hex'
    );

    const issueKey = secp256k1.curve.point(recipient.issueKey.publicKey.x, recipient.issueKey.publicKey.y);
    const ownerPublicKey = secp256k1.g.mul(Buffer.from(sharedSecretScalar.slice(2), 'hex')).add(issueKey);

    const metadata = `0x${toBytes32(ephemeralKey.publicKey.x.fromRed().toString(16))}${ephemeralKey.publicKey.y.isOdd() ? '1' : '0'}`;

    const {
        gamma,
        sigma,
        a,
        k,
    } = await proof.constructCommitment(value, sharedSecretScalar);

    const note = {
        hash: createNoteHash(gamma, sigma),
        value,
        sharedSecretScalar,
        ownerPublicKey: {
            x: ownerPublicKey.x.fromRed(),
            y: ownerPublicKey.y.fromRed(),
        },
        ownerAddress: ecdsa.accountFromPublicKey(ownerPublicKey),
        ephemeralKey: {
            x: ephemeralKey.publicKey.x.fromRed(),
            y: ephemeralKey.publicKey.y.fromRed(),
        },
        metadata,
        gamma,
        sigma,
        a,
        k,
    };
    return note;
};

Wallet.prototype.getNotePrivateKey = function getNotePrivateKey(sharedSecretScalar) {
    const secretBn = new BN(sharedSecretScalar.slice(2), 'hex');
    const issueKeyBn = new BN(this.wallet.issueKey.privateKey.slice(2), 'hex');
    const privateKeyHex = `0x${toBytes32(issueKeyBn.add(secretBn).umod(secp256k1.n).toString(16))}`;
    return privateKeyHex;
};

Wallet.prototype.validateNote = function validateNote(note, recipient /* , value */) {
    const sharedSecret = secp256k1.curve
        .point(note.ephemeralKey.x, note.ephemeralKey.y)
        .mul(Buffer.from(recipient.scanKey.privateKey.slice(2), 'hex'));
    const noteSecret = web3Utils
        .sha3(
            `0x${toBytes32(sharedSecret.x.fromRed().toString(16))}${toBytes32(sharedSecret.y.fromRed().toString(16))}`,
            'hex'
        );
    return (noteSecret === note.privateKey);
};

Wallet.prototype.checkTokenTransfer = function checkTokenTransfer(from, to, value, contractAddress, network) {
    let dirty = false;
    let change = 0;
    if (this.wallet.issueKey.address === from) {
        dirty = true;
        change = -Number(value);
    }
    if (this.wallet.issueKey.address === to) {
        dirty = true;
        change = Number(value);
    }
    if (dirty) {
        const networkWallet = this.wallet[network] || {};
        const contractWallet = networkWallet[contractAddress] || {};
        const oldTokens = contractWallet.tokens || 0;
        this.wallet = {
            ...this.wallet,
            [network]: {
                ...networkWallet,
                [contractAddress]: {
                    ...contractWallet,
                    tokens: oldTokens + change,
                },
            },
        };
        fs.writeFileSync(this.wallet.path, JSON.stringify(this.wallet));
    }
};

Wallet.prototype.checkForDestroyedNotes = function checkForDestroyedNotes(notes, contractAddress, network) {
    const destroyedNotes = notes.filter((note) => {
        const gamma = bn128.point(
            new BN(note[2].slice(2), 16),
            new BN(note[3].slice(2), 16)
        );
        const sigma = bn128.point(
            new BN(note[4].slice(2), 16),
            new BN(note[5].slice(2), 16)
        );
        const hash = createNoteHash(gamma, sigma);
        const networkWallet = this.wallet[network] || {};
        const contractWallet = networkWallet[contractAddress] || {};

        const walletNote = contractWallet[hash];

        const found = (walletNote && gamma.eq(walletNote.gamma) && sigma.eq(walletNote.sigma));
        if (found) {
            this.wallet = {
                ...this.wallet,
                [network]: {
                    ...networkWallet,
                    [contractAddress]: {
                        ...contractWallet,
                        [hash]: {},
                    },
                },
            };
        }
        return found;
    });
    if (destroyedNotes.length > 0) {
        fs.writeFileSync(this.wallet.path, JSON.stringify(this.wallet));
    }
    return destroyedNotes;
};

Wallet.prototype.checkForOwnedNotes = function checkForOwnedNotes(notes, ephemeralKeys, noteOwners, contractAddress, network) {
    const walletNotes = notes.filter((note, index) => {
        const ephemeralKey = ephemeralKeys[index];
        const sharedSecret = secp256k1.curve
            .point(ephemeralKey.x, ephemeralKey.y)
            .mul(Buffer.from(this.wallet.scanKey.privateKey.slice(2), 'hex'));
        const noteSecret = web3Utils
            .sha3(
                `0x${toBytes32(sharedSecret.x.fromRed().toString(16))}${toBytes32(sharedSecret.y.fromRed().toString(16))}`,
                'hex'
            );
        const secretBn = new BN(noteSecret.slice(2), 'hex');
        const stealthPoint = secp256k1.g.mul(secretBn);
        const issueKey = secp256k1.curve.point(this.wallet.issueKey.publicKey.x, this.wallet.issueKey.publicKey.y);
        const testAccount = ecdsa.accountFromPublicKey(issueKey.add(stealthPoint));
        if (testAccount === noteOwners[index]) {
            const gamma = bn128.point(
                new BN(note[2].slice(2), 16),
                new BN(note[3].slice(2), 16)
            );
            const sigma = bn128.point(
                new BN(note[4].slice(2), 16),
                new BN(note[5].slice(2), 16)
            );
            const gammaK = bn128.h.mul(secretBn).neg().add(sigma);
            const k = bn128.recoverMessage(gamma, gammaK);
            const issuePrivateKey = new BN(this.wallet.issueKey.privateKey.slice(2), 16);
            const privateKeyHex = `0x${toBytes32(secretBn.add(issuePrivateKey).umod(secp256k1.n))}`;

            const account = ecdsa.keyPairFromPrivate(privateKeyHex);

            const newNote = {
                hash: createNoteHash(gamma, sigma),
                gamma,
                sigma,
                k,
                a: secretBn,
                ephemeralKey,
                ...account,
            };
            const networkWallet = this.wallet[network] || {};
            const contractWallet = networkWallet[contractAddress] || {};
            this.wallet = {
                ...this.wallet,
                [network]: {
                    ...networkWallet,
                    [contractAddress]: {
                        ...contractWallet,
                        [newNote.hash]: newNote,
                    },
                },
            };
        }
        return (testAccount === noteOwners[index]);
    });
    if (walletNotes.length > 0) {
        fs.writeFileSync(this.wallet.path, JSON.stringify(this.wallet));
    }
    return walletNotes;
};

module.exports = Wallet;
