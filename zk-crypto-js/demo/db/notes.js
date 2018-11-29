const initNote = {
    publicKey: '',
    viewKey: '',
    k: '',
    a: '',
    owner: '',
    noteHash: '',
    parentToken: '',
    status: 'OFF_CHAIN',
};

function generateNotes(database) {
    const notes = {};
    notes.create = (data) => {
        const note = database().get('notes').find({ noteHash: data.noteHash }).value();
        if (note) { throw new Error('transaction ', data.note, ' already exists'); }
        database().get('notes')
            .push({ ...initNote, ...data })
            .write();
        const result = database().get('notes').find({ noteHash: data.noteHash }).value();
        return result;
    };

    notes.update = (noteHash, data) => {
        const note = database()
            .get('notes')
            .find({ noteHash })
            .assign(data)
            .write();
        return note;
    };

    notes.get = (noteHash) => {
        const note = database().get('notes').find({ noteHash }).value();
        return note;
    };

    return notes;
}


module.exports = generateNotes;
