const BN = require('bn.js');

const x = new BN('7081190535524568355315656974523036760523380152477365445145728293506072883734', 10);
const y = new BN('6643502014837482352233300996405865244072646413145838858887843454977897192632', 10);

const t1 = x.sqr().mul(x).add(new BN(3)).umod(new BN('21888242871839275222246405745257275088696311157297823662689037894645226208583', 10));
const t2 = y.sqr().umod(new BN('21888242871839275222246405745257275088696311157297823662689037894645226208583', 10));

console.log('t1 = ', t1);
console.log('t2 = ', t2);