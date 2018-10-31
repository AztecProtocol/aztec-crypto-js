const chai = require('chai');
const crypto = require('crypto');

const BN = require('bn.js');
const ecdsa = require('./ecdsa');
const utils = require('../utils/utils');
const { expect, assert } = chai;

const Web3 = require('web3');
const web3 = new Web3();
const elliptic =  require('elliptic');
const secp256k1 = new elliptic.ec('secp256k1');
describe.only('ecdsa.js tests', () => {

    it.only('another signature test', async() => {
        const { publicKey, privateKey } = ecdsa.generateKeyPair();
        const message = web3.utils.soliditySha3('blah blah bah');
        console.log('private key = ', privateKey);
        console.log('message = ', message);

        const signature = ecdsa.signMessage(message, privateKey);
        const recovered = ecdsa.recoverPublicKey(message, signature[1], signature[2], signature[0]);
        expect(recovered.eq(publicKey)).to.equal(true);
    });
    it('signature test', async () => {
        const rawmessage = web3.utils.soliditySha3('blah blah blah');

        const message = new BN(rawmessage.slice(2), 16);
        const keypair = secp256k1.genKeyPair();
        console.log('priv');
        console.log(keypair.priv);
        const private = `0x${utils.toBytes32(keypair.priv.toString(16))}`;
        const pubkey = secp256k1.g.mul(new BN(private.slice(2), 16));
        const signature = secp256k1.sign(
            Buffer.from(rawmessage.slice(2), 'hex'),
            Buffer.from(private.slice(2), 'hex'),
        );
        console.log(signature);
        const recovered = secp256k1.recoverPubKey(
            Buffer.from(rawmessage.slice(2), 'hex'),
            { r: signature.r, s: signature.s},
            signature.recoveryParam,
        );
        console.log(recovered);
        console.log(pubkey);
        expect(recovered.eq(pubkey)).to.equal(true);
        // console.log(a);
        // console.log(keypair);
        // throw new Error();
        // console.log('message = ', message);
        // const { publicKey, privateKey, address } = ecdsa.generateKeyPair();
        // const sig = ecdsa.signMessage(message, privateKey);
        // const recover = ecdsa.recoverPublicKey(message, sig[1], sig[2], sig[0]);
        // expect(recover.eq(publicKey)).to.equal(true);
    });
    it('can construct a valid signature', async () => {
        const { publicKey, privateKey, address } = ecdsa.generateKeyPair();
        const hash = new BN(crypto.randomBytes(16), 16);
        const { r, s, v } = ecdsa.signMessage(hash, privateKey);
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
        expect(`0x${utils.toBytes32(result.r.toString(16))}` === web3Sig.r);
        expect(`0x${utils.toBytes32(result.s.toString(16))}` === web3Sig.s);
        expect(result.v === web3Sig.v);
    });
});