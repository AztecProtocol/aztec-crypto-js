const chai = require('chai');

const Wallet = require('./wallet');

const { expect } = chai;

describe('Wallet.js tests', () => {
    it('generateNote creates a note that can be deciphered by recoverNote', async () => {
        const recipient = new Wallet('test.json');

        const note = await recipient.generateNote(recipient.wallet, 100);
        const result = recipient.validateNote(note, recipient.wallet);
        expect(result).to.equal(true);
    });
});
