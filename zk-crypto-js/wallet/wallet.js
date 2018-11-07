const fs = require('fs');
const web3Utils = require('web3-utils');
const Elliptic = require('elliptic');
const BN = require('bn.js');

const bn128 = require('../bn128/bn128');
const ecdsa = require('../secp256k1/ecdsa');
const proof = require('../proof/proof');
const { toBytes32 } = require('../utils/utils');

// eslint-disable-next-line
const secp256k1 = new Elliptic.ec('secp256k1');

function createWallet(path) {
    const scanKey = ecdsa.generateKeyPair();
    const issueKey = ecdsa.generateKeyPair();
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
        network: {
            rinkeby: {

            },
            development: {

            },
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

const Wallet = function Wallet(path, exists = false) {
    if (exists) {
        this.wallet = JSON.parse(fs.readFileSync(`${path}`));
    } else {
        this.wallet = createWallet(path);
    }
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

    const metadata = [
        `0x${toBytes32(ephemeralKey.publicKey.x.fromRed().toString(16))}`,
        `0x${toBytes32(ephemeralKey.publicKey.y.isOdd() ? '1' : '0')}`,
    ];
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

Wallet.prototype.addNoteAccount = function addNoteAccount(ephemeralKey, gamma, sigma, k) {
    const sharedSecret = secp256k1.curve
        .point(ephemeralKey.x, ephemeralKey.y)
        .mul(Buffer.from(this.wallet.scanKey.privateKey.slice(2), 'hex'));
    const noteSecret = web3Utils
        .sha3(
            `0x${toBytes32(sharedSecret.x.fromRed().toString(16))}${toBytes32(sharedSecret.y.fromRed().toString(16))}`,
            'hex'
        );
    const secretBn = new BN(noteSecret.slice(2), 'hex');
    const issueKeyBn = new BN(this.wallet.issueKey.privateKey.slice(2), 'hex');
    const privateKeyHex = `0x${toBytes32(issueKeyBn.add(secretBn).umod(secp256k1.n).toString(16))}`;
    const account = ecdsa.keyPairFromPrivate(privateKeyHex);
    const note = {
        hash: createNoteHash(gamma, sigma),
        gamma,
        sigma,
        k,
        ephemeralKey,
        ...account,
    };
    this.wallet = {
        ...this.wallet,
        [note.hash]: note,
    };
    return account;
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

Wallet.prototype.addNote = function addNote(wallet, note, chain = 'development') {
    const newWallet = {
        ...wallet,
        chain: {
            ...wallet[chain],
            [note.hash]: note,
        },
    };
    fs.writeFileSync(wallet.path, JSON.stringify(newWallet));
    return newWallet;
};

Wallet.prototype.addTokens = function addTokens(wallet, tokens, chain = 'development') {
    const newWallet = {
        ...wallet,
        chain: {
            ...wallet[chain],
            tokens,
        },
    };
    fs.writeFileSync(wallet.path, JSON.stringify(newWallet));
    return newWallet;
};

Wallet.prototype.checkForDestroyedNotes = function checkForDestroyedNotes(notes) {
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
        const walletNote = this.wallet[hash];

        const found = (walletNote && gamma.eq(walletNote.gamma) && sigma.eq(walletNote.sigma));
        if (found) {
            console.log('found note in wallet, removing');
            this.wallet = {
                ...this.wallet,
                [hash]: {},
            };
        }
        return found;
    });
    if (destroyedNotes.length > 0) {
        fs.writeFileSync(this.wallet.path, JSON.stringify(this.wallet));
    }
    return destroyedNotes;
};

Wallet.prototype.checkForOwnedNotes = function checkForOwnedNotes(notes, ephemeralKeys, noteOwners) {
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
            // what now?
            // recover note secret
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
            this.wallet = {
                ...this.wallet,
                [newNote.hash]: newNote,
            };
            console.log('FOUND A VALUE FOR K: ', k);
        }
        return (testAccount === noteOwners[index]);
    });
    if (walletNotes.length > 0) {
        fs.writeFileSync(this.wallet.path, JSON.stringify(this.wallet));
    }
    return walletNotes;
};
module.exports = Wallet;
