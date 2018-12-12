const BN = require('bn.js');

const basicWallet = require('../basicWallet/basicWallet');
const notes = require('../../aztec-crypto-js/note/note');
const { GROUP_MODULUS } = require('../../aztec-crypto-js/params');
const db = require('../db/db');
const proof = require('../../aztec-crypto-js/proof/proof');
const sign = require('../../aztec-crypto-js/utils/sign');

const noteController = {};

noteController.get = (noteHash) => {
    const rawNote = db.notes.get(noteHash);
    if (!rawNote) {
        throw new Error(`could not find note at ${noteHash}`);
    }
    return {
        note: notes.fromViewKey(rawNote.viewKey),
        ...rawNote,
    };
};

noteController.createNote = (owner, value) => {
    const wallet = basicWallet.get(owner);
    if (!wallet) {
        throw new Error(`wallet at address ${owner} does not exist`);
    }
    const parentToken = db.contracts.aztec.get().latest;
    if (!parentToken || !parentToken.contractAddress) {
        throw new Error(`expected contract ${parentToken} to exist`);
    }
    const note = notes.create(wallet.publicKey, value);
    const exported = {
        ...note.exportNote(),
        owner,
        parentToken: parentToken.contractAddress,
        status: 'OFF_CHAIN',
    };
    db.notes.create(exported);
    return note;
};

noteController.setNoteStatus = (noteHash, status) => {
    const note = db.notes.get(noteHash);
    if (!note) {
        throw new Error(`could not find note with noteHash ${noteHash}`);
    }
    return db.notes.update(noteHash, {
        ...note,
        status,
    });
};

noteController.encodeMetadata = (noteArr) => {
    const result = noteArr.reduce((acc, note) => {
        const ephemeral = note.exportMetadata();
        return `${acc}${ephemeral.slice(2)}`;
    }, '');
    return `0x${result}`;
};

noteController.createConfidentialTransfer = (inputNoteHashes, outputNoteData, v, senderAddress) => {
    let kPublic;
    if (v < 0) {
        kPublic = GROUP_MODULUS.sub(new BN(-v));
    } else {
        kPublic = new BN(v);
    }
    const aztecTokenContract = db.contracts.aztecToken.get().latest;
    const aztecTokenAddress = aztecTokenContract.contractAddress;

    const inputNotes = inputNoteHashes.map(noteHash => noteController.get(noteHash));
    const outputNotes = outputNoteData.map(([owner, value]) => noteController.createNote(owner, value));
    const m = inputNotes.length;
    const noteData = [...inputNotes.map(n => n.note), ...outputNotes];

    const { proofData, challenge } = proof.constructJoinSplit(noteData, m, senderAddress, kPublic);
    const metadata = noteController.encodeMetadata(inputNotes.map(n => n.note));

    const outputOwners = outputNoteData.map(([owner]) => owner);

    const inputSignatures = inputNotes.map((inputNote, index) => {
        const { owner } = inputNote;
        const wallet = basicWallet.get(owner);
        return sign.signNote(proofData[index], challenge, senderAddress, aztecTokenAddress, wallet.privateKey).signature;
    });

    const noteHashes = noteData.map(n => n.noteHash);

    return {
        proofData,
        m,
        challenge,
        inputSignatures,
        outputOwners,
        metadata,
        noteHashes,
    };
};

module.exports = noteController;
