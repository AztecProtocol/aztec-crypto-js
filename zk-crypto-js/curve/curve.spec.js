const chai = require('chai');
const crypto = require('crypto');

const BN = require('bn.js');
const curve = require('./curve');
const utils = require('../utils/utils');
const { fieldReduction, groupReduction } = require('../params');
const { expect, assert } = chai;

describe('curve.js tests', () => {

    it('curve exports the bn128 curve', async () => {
        const testPoint = curve.randomPoint();
        const scalar = new BN(crypto.randomBytes(32), 16).toRed(groupReduction);
        const scalarInverse = scalar.redInvm();
        const result = testPoint.mul(scalar).mul(scalarInverse);
        expect(result.eq(testPoint));
    });
});