const chai = require('chai');

const setup = require('./setup');
const { K_MAX, K_MIN } = require('../params');

const { expect, assert } = chai;

describe('setup.js tests', () => {

    it('setup.readSignature will retrieve well-formed elliptic curve points', async () => {
        const k = Math.floor(Math.random() * (K_MAX - K_MIN + 1)) + K_MIN;
        const point = await setup.readSignature(k);
        expect(point.x).to.exist;
        expect(point.y).to.exist;
    });
});