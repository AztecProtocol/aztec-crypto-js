var Migrations = artifacts.require("./Migrations.sol");
/* global artifacts, assert, contract, beforeEach, it:true */
const AZTEC = artifacts.require('./contracts/AZTEC/AZTEC');
const AZTECInterface = artifacts.require('./contracts/AZTEC/AZTECInterface');
const ZEthereum = artifacts.require('./contracts/AZTEC/ZEthereum');

AZTEC.abi = AZTECInterface.abi;

module.exports = function(deployer) {
  deployer.deploy(Migrations);

};


// async function test(deployer) {
//     await deployer.deploy(AZTEC);
//     const aztecAddress = AZTEC.address;
// }