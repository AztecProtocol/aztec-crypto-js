const chai = require('chai');
const BN = require('bn.js');

const { expect, assert } = chai;

const utils = require('./utils');

describe('utils.js tests', () => {
    it('utils.compress will correctly compress coordinate with even y', () => {
        const compressed = utils.compress(new BN(2), new BN(4));
        expect(compressed.eq(new BN(2))).to.be.true;
    });
    
    it('utils.compress will correctly compress coordinate with odd y', () => {
        let compressed = utils.compress(new BN(2), new BN(1));
        expect(compressed.testn(255)).to.be.true;
        compressed = compressed.maskn(255);
        expect(compressed.eq(new BN(2))).to.be.true;
    });

    it('utils.decompress will correctly decompress a compressed coordinate', () => {
        const point = utils.randomG1();
        let { x, y } = utils.decompress(utils.compress(point.x, point.y));
        expect(x.eq(point.x)).to.be.true;
        expect(y.eq(point.y)).to.be.true;
    });
});