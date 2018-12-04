const chai = require('chai');
const BN = require('bn.js');

const { expect } = chai;

const utils = require('./utils');
const {
    fieldReduction,
    zeroRed,
    weierstrassBRed,
} = require('../params');


function randomG1() {
    function recurse() {
        const x = new BN(crypto.randomBytes(32), 16).toRed(fieldReduction);
        const y2 = x.redSqr().redMul(x).redIAdd(weierstrassBRed);
        const y = y2.redSqrt();
        if (y.redSqr(y).redSub(y2).cmp(zeroRed)) {
            return recurse();
        }
        return ({ x: x.fromRed(), y: y.fromRed() });
    }
    return recurse();
}

describe('utils.js tests', () => {
    it('utils.compress will correctly compress coordinate with even y', () => {
        const compressed = utils.compress(new BN(2), new BN(4));
        expect(compressed.eq(new BN(2))).to.equal(true);
    });

    it('utils.compress will correctly compress coordinate with odd y', () => {
        let compressed = utils.compress(new BN(2), new BN(1));
        expect(compressed.testn(255)).to.equal(true);
        compressed = compressed.maskn(255);
        expect(compressed.eq(new BN(2))).to.equal(true);
    });

    it('utils.decompress will correctly decompress a compressed coordinate', () => {
        const point = randomG1();
        const { x, y } = utils.decompress(utils.compress(point.x, point.y));
        expect(x.eq(point.x)).to.equal(true);
        expect(y.eq(point.y)).to.equal(true);
    });
});
