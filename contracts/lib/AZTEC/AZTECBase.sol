// pragma solidity ^0.4.23;
// pragma experimental ABIEncoderV2;

// import "./Bn128.sol";

// /// @title Library to validate AZTEC zero-knowledge proofs
// /// @author CreditMint
// /// @dev All methods should act as pure functions, however the compile does not distinguish
// /// @dev between precompile contracts and real contracts, so methods that implement
// /// @dev staticcall to bn128 precompiles must be declared view

// contract AZTECBase {
//     using Bn128 for Bn128.Point;

//     struct InputNote {
//         Bn128.Point c;
//         uint b;
//         uint k;
//     }

//     struct OutputNote {
//         Bn128.Point c;
//         Bn128.Point gamma;
//         Bn128.Point sigma;
//         uint b;
//         uint k;
//     }
//     function joinSplit(InputNote[] inputNotes, OutputNote[] outputNotes, uint challenge) external view returns (bool) {

//         bytes32 revolvingHash;
//         Bn128.Point memory blindingFactor;
//         Bn128.Point memory scratchPoint;
//         Bn128.Point memory homomorphicSum = Bn128.Point(Bn128.inf_x(), Bn128.inf_y());
//         Bn128.Point memory pairingPoint;
//         Bn128.Point memory scratchPointB;
//         // hmm... need to reuse a few of these points....

//         // so, what am I re-using?
//         // all of the g^(signature)
//         uint pairingScalar = challenge;
//         for (uint i = 0; i < inputNotes.length; i++) {
            
//             blindingFactor._mulHInPlace(inputNotes[i].b);
//             scratchPoint = inputNotes[i].c;
//             scratchPoint._neg();
//             scratchPoint._mulInPlace(challenge);
//             blindingFactor._addInPlace(scratchPoint);
//             homomorphicSum._addInPlace(blindingFactor);
//             scratchPoint._mulGInPlace(inputNotes[i].k);
//             blindingFactor._addInPlace(scratchPoint);
//             revolvingHash = Bn128._hash(revolvingHash, blindingFactor);
//         }
//         for (uint j = 0; j < outputNotes.length; j++) {
//             blindingFactor = outputNotes[j].c;
//             blindingFactor._neg();
//             blindingFactor._mulInPlace(challenge);
            
//             scratchPoint._mulHInPlace(outputNotes[j].b);

//             blindingFactor._addInPlace(scratchPoint);
//             homomorphicSum._subInPlace(blindingFactor);

//             scratchPointB._mulGInPlace(outputNotes[j].k);
//             blindingFactor._addInPlace(scratchPointB);
//             revolvingHash = Bn128._hash(revolvingHash, blindingFactor);

//             blindingFactor = outputNotes[j].gamma;
//             blindingFactor._neg();
//             blindingFactor._mulInPlace(outputNotes[j].k);
//             blindingFactor._addInPlace(scratchPoint);

//             scratchPoint = outputNotes[j].sigma;
//             scratchPoint._neg();
//             scratchPoint._mulInPlace(challenge);
//             if (j == 1) {
//                 pairingPoint = scratchPoint;
//             } else {

//             }
//             blindingFactor._addInPlace(scratchPoint);

//             revolvingHash = Bn128._hash(revolvingHash, blindingFactor);
//         }
//         revolvingHash = Bn128._hash(revolvingHash, homomorphicSum);

//         // validate bilinear pairing
//         scratchPoint = outputNotes[0].gamma;
//         // Bn128.Point memory homomorphicSum = inputNotes[0].c;
//         // for (uint i = 1; i < inputNotes.length; i++) {
//         //     homomorphicSum._addInPlace(inputNotes[i].c);
//         // }
//         // for (i = 0; i < outputNotes.length; i++) {
//         //     homomorphicSum._subInPlace(outputNotes[i].c);
//         // }
//     }
//     function test(uint input) pure returns (bool blah) {
//         blah = input > 0;
//     }
// }