const BN = require('bn.js');
const web3Utils = require('web3-utils');
const crypto = require('crypto');

const secp256k1 = require('../../secp256k1/secp256k1');
const bn128 = require('../../bn128/bn128');
const setup = require('../../setup/setup');

const { padLeft } = web3Utils;

function getNoteHash(gamma, sigma) {
    const gammaX = padLeft(gamma.x.fromRed().toString(16), 64);
    const gammaY = padLeft(gamma.y.fromRed().toString(16), 64);
    const sigmaX = padLeft(sigma.x.fromRed().toString(16), 64);
    const sigmaY = padLeft(sigma.y.fromRed().toString(16), 64);
    return web3Utils.sha3(`0x${gammaX}${gammaY}${sigmaX}${sigmaY}`, 'hex');
}

function getSharedSecret(ephemeralKey, privateKey) {
    const sharedSecret = ephemeralKey.mul(privateKey);
    const sharedSecretHex = `0x${sharedSecret.encode(false).toString('hex')}`;
    return web3Utils.sha3(sharedSecretHex, 'hex');
}

function Note(publicKey, viewingKey) {
    if (publicKey && viewingKey) {
        throw new Error('expected one of publicKey or viewingKey, not both');
    }
    if (publicKey) {
        if (typeof (publicKey) !== 'string') {
            throw new Error(`expected key ${publicKey} to be of type string`);
        }
        if (publicKey.length !== 200) {
            throw new Error(`invalid public key length for key ${publicKey}, expected 200, got ${publicKey.length}`);
        }
        this.gamma = bn128.ec.keyFromPublic(publicKey.slice(2, 68), 'hex');
        this.sigma = bn128.ec.keyFromPublic(publicKey.slice(68, 134), 'hex');
        this.ephemeral = secp256k1.keyFromPublic(publicKey.slice(134, 200), 'hex');
        this.k = null;
        this.a = null;
    }
    if (viewingKey) {
        this.a = new BN(viewingKey.slice(2, 66), 16);
        this.k = new BN(viewingKey.slice(66, 74), 16);
        this.ephemeral = secp256k1.keyFromPublic(viewingKey.slice(74, 140), 'hex');
        const mu = bn128.ec.keyFromPublic(setup.readSignatureSync(this.k.toNumber()));
        this.gamma = bn128.ec.keyFromPublic(mu.getPublic().mul(this.a));
        this.sigma = bn128.ec.keyFromPublic(this.gamma.getPublic().mul(this.k).add(bn128.h.mul(this.a)));
    }
    this.id = getNoteHash(this.gamma.getPublic(), this.sigma.getPublic());
}

Note.prototype.getPublic = function getPublic() {
    const gamma = this.gamma.getPublic(true, 'hex');
    const sigma = this.sigma.getPublic(true, 'hex');
    const ephemeral = this.ephemeral.getPublic(true, 'hex');
    return `0x${padLeft(gamma, 66)}${padLeft(sigma, 66)}${padLeft(ephemeral, 66)}`;
};

Note.prototype.getView = function getView() {
    const a = padLeft(this.a.toString(16), 64);
    const k = padLeft(this.k.toString(16), 8);
    const ephemeral = padLeft(this.ephemeral.getPublic(true, 'hex'), 66);
    return `0x${a}${k}${ephemeral}`;
};

Note.prototype.derive = function derive(spendingKey) {
    const sharedSecret = getSharedSecret(this.ephemeral.getPublic(), Buffer.from(spendingKey.slice(2), 'hex'));
    this.a = new BN(sharedSecret.slice(2), 16).umod(bn128.n);
    const gammaK = this.sigma.getPublic().add(bn128.h.mul(this.a).neg());
    this.k = bn128.recoverMessage(this.gamma.getPublic(), gammaK);
};

Note.prototype.exportNote = function exportNote() {
    const publicKey = this.getPublic();
    const viewKey = this.getView();
    let k = '';
    let a = '';
    if (BN.isBN(this.k)) {
        k = padLeft(this.k.toString(16), 64);
    }
    if (BN.isBN(this.a)) {
        a = padLeft(this.a.toString(16), 64);
    }
    return {
        publicKey,
        viewKey,
        k,
        a,
        noteHash: this.noteHash,
    };
};

function createSharedSecret(publicKeyHex) {
    const publicKey = secp256k1.keyFromPublic(publicKeyHex, 'hex');

    const ephemeralKey = secp256k1.keyFromPrivate(crypto.randomBytes(32, 16));
    const sharedSecret = publicKey.getPublic().mul(ephemeralKey.priv);
    const sharedSecretHex = `0x${sharedSecret.encode(false).toString('hex')}`;
    const encoded = web3Utils.sha3(sharedSecretHex, 'hex');
    return {
        ephemeralKey: `0x${ephemeralKey.getPublic(true, 'hex')}`,
        encoded,
    };
}

const note = {};

note.fromPublicKey = function fromPublicKey(publicKey) {
    return new Note(publicKey, null);
};

note.fromViewKey = function fromViewKey(viewKey) {
    const newNote = new Note(null, viewKey);
    return newNote;
};

note.derive = function derive(publicKey, spendingKey) {
    const newNote = new Note(publicKey);
    newNote.derive(spendingKey);
    return newNote;
};

note.create = function fromValue(spendingPublicKey, value) {
    const sharedSecret = createSharedSecret(spendingPublicKey);
    const a = padLeft(new BN(sharedSecret.encoded.slice(2), 16).umod(bn128.n).toString(16), 64);
    const k = padLeft(web3Utils.toHex(value).slice(2), 8);
    const ephemeral = padLeft(sharedSecret.ephemeralKey.slice(2), 66);
    const viewKey = `0x${a}${k}${ephemeral}`;
    return new Note(null, viewKey);
};

module.exports = note;
