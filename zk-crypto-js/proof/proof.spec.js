const chai = require('chai');

const proof = require('./proof');

const { expect, assert } = chai;

describe('proof.js tests', () => {

    it('proof.constructJoinSplit creates a join split proof', async () => {
        const kIn = [ 41, 31, 16 ];
        const kOut = [ 51, 36 ];
        const commitments = await proof.constructCommitmentSet({ kIn, kOut });
        const result = proof.constructJoinSplit(commitments);
        expect(result.inputs.length === 3);
        expect(result.outputs.length === 2);
    });
});