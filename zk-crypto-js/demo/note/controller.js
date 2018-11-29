const basicWallet = require('../basicWallet/basicWallet');
const notes = require('../note/notes');

const db = require('../db/db');

const noteController = {};

noteController.createNote = (owner, value) => {
    const wallet = basicWallet.get(owner);
    if (!wallet) {
        throw new Error(`wallet at address ${owner} does not exist`);
    }
    const parentToken = db.contracts.aztec.get().latest;
    if (!parentToken || !parentToken.address) {
        throw new Error(`expected contract ${parentToken} to exist`);
    }
    const note = notes.create(wallet.publicKey, value);
    const exported = {
        ...note.exportNote(),
        owner,
        parentToken: parentToken.address,
        status: 'OFF_CHAIN',
    };
    db.notes.create(exported);
};

noteController.setNoteStatus = (noteHash, status) => {
    const note = notes.get(noteHash);
    if (!note) {
        throw new Error(`could not find note with noteHash ${noteHash}`);
    }
    return db.notes.update(noteHash, {
        ...note,
        status,
    });
};

module.exports = noteController;
