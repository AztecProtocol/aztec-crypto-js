const chai = require('chai');
const crypto = require('crypto');
const web3Utils = require('web3-utils');

const BN = require('bn.js');
const ecdsa = require('./ecdsa');
const { toBytes32 } = require('../utils/utils');
const secp256k1 = require('./secp256k1');

const { expect } = chai;


describe('ecdsa.js tests', () => {
    it('signature parameters can be used to recover signer public key', async () => {
        const rawmessage = web3Utils.soliditySha3('this is a test message');

        const keypair = secp256k1.genKeyPair();
        const privateKey = `0x${toBytes32(keypair.priv.toString(16))}`;
        const pubkey = secp256k1.g.mul(new BN(privateKey.slice(2), 16));
        const signature = secp256k1.sign(
            Buffer.from(rawmessage.slice(2), 'hex'),
            Buffer.from(privateKey.slice(2), 'hex')
        );
        const recovered = secp256k1.recoverPubKey(
            Buffer.from(rawmessage.slice(2), 'hex'),
            { r: signature.r, s: signature.s },
            signature.recoveryParam
        );
        expect(recovered.eq(pubkey)).to.equal(true);
    });

    it('can construct a valid signature', async () => {
        const { publicKey, privateKey } = ecdsa.generateKeyPair();
        const hash = new BN(crypto.randomBytes(16), 16);
        const { r, s } = ecdsa.signMessage(hash, privateKey);
        const res = ecdsa.verifyMessage(hash, r, s, publicKey);
        expect(res).to.equal(true);
    });

    it('can recover signing public key', async () => {
        const { publicKey, privateKey } = ecdsa.generateKeyPair();
        const hash = new BN(crypto.randomBytes(16), 16);
        const { r, s, v } = ecdsa.signMessage(hash, privateKey);
        const res = ecdsa.recoverPublicKey(hash, r, s, v);
        expect(res.eq(publicKey)).to.equal(true);
    });

    it('signs the same signatures as web3?', async () => {
        const { result, web3Sig } = ecdsa.web3Comparison();
        expect(`0x${toBytes32(result.r.toString(16))}` === web3Sig.r);
        expect(`0x${toBytes32(result.s.toString(16))}` === web3Sig.s);
        expect(result.v === web3Sig.v);
    });
});
