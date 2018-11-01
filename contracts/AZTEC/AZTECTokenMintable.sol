pragma solidity ^0.4.25;

import "./AZTECToken.sol";
import "./AZTEC.sol";

contract AZTECTokenMintable {

    // event Initialized(address[] owners, bytes32[] hashes);
    // event DebugNote(uint[6]);
    // event DebugUint(uint);
    // address initializer;
    // constructor(
    //     bytes32[4] _setupPubKey,
    //     address _verifier,
    //     address[] initialNoteOwners,
    //     bytes32[] k,
    //     bytes32[] a,
    //     bytes32[] gammaX,
    //     bytes32[] gammaY,
    //     bytes32[] sigmaX,
    //     bytes32[] sigmaY,
    //     uint challenge,
    //     uint totalSupply
    //     ) AZTECTokenBase(_setupPubKey, _verifier) public {
    //     require(
    //         (initialNoteOwners.length == k.length) &&
    //         (a.length == k.length) &&
    //         (gammaX.length == gammaY.length) &&
    //         (sigmaX.length == sigmaY.length)
    //     );
    //     bytes32[6][] memory initialNotes = new bytes32[6][](k.length);
    //     for (uint i = 0; i < k.length; i++) {
    //         initialNotes[i] = [ k[i], a[i], gammaX[i], gammaY[i], sigmaX[i], sigmaY[i] ];
    //     }
    //     bytes32[] memory inputNoteHashes = hashOutputNotes(initialNoteOwners, initialNotes);
    //     if (OptimizedAZTECInterface(verifier).validateCommit(initialNotes, challenge, totalSupply, setupPubKey)) {
    //         for (uint j = 0; j < inputNoteHashes.length; j++) {
    //             noteRegistry[inputNoteHashes[j]] = true;
    //         }
    //     }
    //     emit Initialized(initialNoteOwners, inputNoteHashes);
    // }

    // // event Debug1(uint[4] t2);
    // // function mint(address[] initialNoteOwners, uint[6][] initialNotes, uint challenge, uint totalSupply) external {
    // //     require(msg.sender == initializer);
    // //     initializer = address(-1);
    // //     require(initialNoteOwners.length == initialNotes.length);
    // //     bytes32[] memory inputNoteHashes = hashOutputNotes(initialNoteOwners, initialNotes);

    // //     if (OptimizedAZTECInterface(verifier).validateCommit(initialNotes, challenge, totalSupply, setupPubKey)) {
    // //         for (uint i = 0; i < inputNoteHashes.length; i++) {
    // //             noteRegistry[inputNoteHashes[i]] = true;
    // //         }
    // //     }
    // //     Debug1(setupPubKey);
    // // }
}