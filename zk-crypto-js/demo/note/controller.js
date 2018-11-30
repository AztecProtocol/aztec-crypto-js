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
    const note = notes.get(noteHash);
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

module.exports = noteController;
