const chai = require('chai');
const BN = require('bn.js');

const setup = require('./setup');
const { K_MAX, K_MIN } = require('../params');

const { expect } = chai;

describe.only('setup.js tests', () => {
    it('setup.readSignature will retrieve well-formed elliptic curve points', async () => {
        const k = Math.floor(Math.random() * (K_MAX - K_MIN + 1)) + K_MIN;
        const point = await setup.readSignature(k);
        expect(BN.isBN(point.x)).to.equal(true);
        expect(BN.isBN(point.y)).to.equal(true);
    });
});
