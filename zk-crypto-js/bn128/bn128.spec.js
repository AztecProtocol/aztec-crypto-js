const chai = require('chai');
const crypto = require('crypto');

const BN = require('bn.js');
const bn128 = require('./bn128');

const { groupReduction } = require('../params');

const { expect } = chai;

describe('curve.js tests', () => {
    it('curve exports the bn128 curve', async () => {
        const testPoint = bn128.randomPoint();
        const scalar = new BN(crypto.randomBytes(32), 16).toRed(groupReduction);
        const scalarInverse = scalar.redInvm();
        const result = testPoint.mul(scalar).mul(scalarInverse);
        expect(result.eq(testPoint));
    });
});
