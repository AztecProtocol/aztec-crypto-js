const chai = require('chai');
const crypto = require('crypto');

const BN = require('bn.js');
const bn128 = require('./bn128');

const { groupReduction } = require('../params');

const { expect } = chai;

describe.only('curve.js tests', () => {
    it('curve exports the bn128 curve', async () => {
        const testPoint = bn128.randomPoint();
        const scalar = new BN(crypto.randomBytes(32), 16).toRed(groupReduction);
        const scalarInverse = scalar.redInvm();
        const result = testPoint.mul(scalar).mul(scalarInverse);
        expect(result.eq(testPoint));
        expect(testPoint.x.redSqr().redMul(testPoint.x).redAdd(bn128.b).eq(testPoint.y.redSqr())).to.equal(true);
    });

    it('aztec compression/decompression functions for general points', async () => {
        const p1 = bn128.randomPoint();
        const p2 = bn128.randomPoint();
        const compressed = bn128.aztecCompressed(p1, p2);
        const decompressed = compressed.aztecDecompress();
        expect(decompressed.p1.eq(p1)).to.equal(true);
        expect(decompressed.p2.eq(p2)).to.equal(true);
    });

    it('aztec compression/decompression functions for points where y1 = y2', async () => {
        const p1 = bn128.randomPoint();
        const p2 = bn128.point(p1.x.redMul(bn128.endo.beta), p1.y);
        const compressed = bn128.aztecCompressed(p1, p2);
        const decompressed = compressed.aztecDecompress();
        console.log(p1);
        console.log(decompressed.p1);
        expect(decompressed.p1.eq(p1)).to.equal(true);
        expect(decompressed.p2.eq(p2)).to.equal(true);
    });
});
