// pragma solidity ^0.4.23;
// pragma experimental ABIEncoderV2;

// import "./Crypto.sol";

// /// @title Library to validate AZTEC zero-knowledge proofs
// /// @author CreditMint
// /// @dev All methods should act as pure functions, however the compile does not distinguish
// /// @dev between precompile contracts and real contracts, so methods that implement
// /// @dev staticcall to bn128 precompiles must be declared view

// contract AZTECBase {
//     using Crypto for Crypto.Point;
//     // /// @dev documentation test
//     struct Note {
//         Crypto.Point c;
//         uint b;
//         uint k;
//     }

//     function join(Note[] memory inputNotes, Note[] memory outputNotes) public view returns (bool) {
//         require(inputNotes.length > 0);
//         require(outputNotes.length > 0);
//         Crypto.Point memory homomorphicSum = inputNotes[0].c;
//         for (uint i = 1; i < inputNotes.length; i++) {
//             homomorphicSum._addInPlace(inputNotes[i].c);
//         }
//         for (i = 0; i < outputNotes.length; i++) {
//             homomorphicSum._subInPlace(outputNotes[i].c);
//         }
//     }
//     function test(uint input) pure returns (bool blah) {
//         blah = input > 0;
//     }
// }