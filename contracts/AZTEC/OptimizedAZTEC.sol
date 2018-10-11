pragma solidity ^0.4.23;


contract OptimizedAZTECInterface {
    function validateJoinSplit(uint[6][] inputs, uint[6][] outputs, uint challenge, uint[4] t2) external view returns (bool) {}
    function validateCommit(uint[6][] outputs, uint challenge, uint k, uint[4] t2) external view returns (bool) {}
    function validateReveal(uint[6][] inputs, uint challenge, uint k, uint[4] t2) external view returns (bool) {}
}

contract Main {
    constructor () public {
        OptimizedAZTEC aztec = new OptimizedAZTEC();
        assembly {
/* mstore(0x00, 0xabacadae)
mstore(0x04, 0xe0)
mstore(0x24, 0x280)
mstore(0x44, 0x203b1e597bcc746a43942de8978f5ecf42316846dbf893ab8c343ec8a724556b)
mstore(0x64, 0x210db872dec2e06c375dd40a5a354307bb4ba52ba65bd84594554580ae6f0639)
mstore(0x84, 0x153f806ab3b6b1514bdd6ed8b5815db000f9df529b09586b67994cb0f0640620)
mstore(0xa4, 0x15ccfd881b5648efcdb7902ccabea48b076e026c9ce4bdc35e491edc7e47ae51)
mstore(0xc4, 0x29874b8609546d9d502bf56d2a8e3b6dcb9aa3ae48d93c317834f66780539c6b)
mstore(0xe4, 0x02)
mstore(0x104, 0x2922947ffd95beff15383a473ddf70a30bdb208e3b04f111febfae4cec746122)
mstore(0x124, 0x219a583247fa2f24ce88df21af055fa8db05cbbb0177c7c5e77bbc78e4b316b2)
mstore(0x144, 0x210505e413c50a73965231b10dc570833ef69890a0de84bf80aac3700c80664d)
mstore(0x164, 0x406bb8ee8107e829ed92ae3b5152641d36fc0cca0fb96c7f6fc8a983d05c84a)
mstore(0x184, 0x2153ffe965ab197586d89a006bddefafb937ac88b9db456ba9a74f9c90237fb6)
mstore(0x1a4, 0x1c3f7a99a837759457ef037d60e2e34222e3a5434b0ec3e6f2af16b3dc6b61fe)
mstore(0x1c4, 0x24efacf31dbe0c7e43f6675dd72d1a97c22c2dd5a1c762d20f48af95e40a465e)
mstore(0x1e4, 0x1a88ee0e74c8b9a2ee43cec46b414381ca81a3f4c0f9ee16bdde85496bc564c)
mstore(0x204, 0xf4bb41ca0bf0c0497d923af827d075599cb53fa5842684f2034378e14d007ec)
mstore(0x224, 0x2c82084b75261f401a1a2554a85242635c47f85fbb8a719c895e20ee9f8a13e2)
mstore(0x244, 0x14f089a2478cb98010660e8d01287e3d09eb13d49fe67a4cc4452cc6fd8fe262)
mstore(0x264, 0x20e0f0ddf6537898f252906e72ebd50f96a30c811b248612641395a01194c743)
mstore(0x284, 0x02)
mstore(0x2a4, 0x25d2d0832f7442de44a4924ccc36d7474fbc3e40ce92a188de39d7b71c13f0fd)
mstore(0x2c4, 0x2850254a8742361ddf5ed721deb2e076ae99fbaba9baa3b3d07183b12c6b8626)
mstore(0x2e4, 0x1d02ededd2e619a4357670d25adbf8a71a84364a1b87f9597418e58a548665aa)
mstore(0x304, 0x1dd622033d916e2cfa43f3a8f0852993abbeb9cf8461192c89ca2c70b51c4550)
mstore(0x324, 0x181f509f80976cf814750a9115fd96851fbf5e88d0478d431d4f8b5d9598e1f8)
mstore(0x344, 0x1c5d82879d00346215e90fdfc36840e7473d5c4107ee5cd42d3f2d705d7936b8)
mstore(0x364, 0x1d200e07f81ff97fee8e2334d216e7b07cffa02f2a32a06c48db433ae5a4b6ab)
mstore(0x384, 0x12da52a5c9031d36eac6a883d8a3fea75e73d0be989e0c78c62dcb7f49e30e9a)
mstore(0x3a4, 0xf4b4f66c86dd93de21d6b193552e5cee1fa5c112854213bb7bcbca828e08510)
mstore(0x3c4, 0x296fe5906e3d52f1d0be1848830b6d2e8082a4037864b6199e2a72ab5eb8271a)
mstore(0x3e4, 0x22c7bf27c7e33dd046049818f8a6a09063393b71abc2631e93d6aa3023b4f2ab)
mstore(0x404, 0x6fa80c91fc125e7f2699b109d28ea3e0410d62fb12c9a46aa2decc0dcfbd160) */
mstore(0x00, 0xabacadae)
mstore(0x04, 0xe0)
mstore(0x24, 0x6a4a3428e2153dffe98f8901ae61ab4835014ee157440e843235847c629fc96)
mstore(0x44, 31)
mstore(0x64, 14950566033311135686370363156509914218680817943817569491591494889531912422969)
mstore(0x84, 9610767485542423883105294407743945250667713657405871070087733105932454069792)
mstore(0xa4, 9860756432720796732044151731608020682550918224148190991029235559105326198353)
mstore(0xc4, 18783872390250408862708187214286825950859215155181481328910531821469087013995)
mstore(0xe4, 0x02)
mstore(0xe4, 0x02)
mstore(0x104, 15952465920637606197304492604378960474442339831957012852964990692472710373771)
mstore(0x124, 15162931765990142265633528508676857157688449737188290218499551258085358363090)
mstore(0x144, 18705425659974042713319496705733137295292325503598439361779508479024171856042)
mstore(0x164, 20479515101552637006589896265865630140442514465302365980746516662052808961064)
mstore(0x184, 19334226699179176192131496744198613557337572648000325129653277409118519589882)
mstore(0x1a4, 16869667320063130542323520811551249762685050048573156762017139787539895161932)
mstore(0x1c4, 10061015863389046898810274214775911824998746295278678420397662851790292290618)
mstore(0x1e4, 21784912237506271740161633351004659200766312691860239038269986315017159999810)
mstore(0x204, 3873169977555659419780165660098321239119804247296171214904406844117140095217)
mstore(0x224, 3716402438468365183474634165626390359004109917373519064720612733611934613958)
mstore(0x244, 20014238172306110097787337979881366159367229319112033586740333721175272455323)
mstore(0x264, 9811826193845390870329004351816580124702604239287081478439299947678752473302)
let success := staticcall(not(0), aztec, 0x00, 0x284, 0x500, 0x20)

            return(0x00, 0x20)
        }
    }
}
/// @title Library to validate AZTEC zero-knowledge proofs
/// @author CreditMint
/// @dev All rights reserved. This is a technical demo! Use at your own risk!
/// @notice Don't include this as an internal library. I use a static memory table to cache elliptic curve primitives and hashes.
/// Calling this internally from another function will lead to memory mutation and undefined behaviour.
/// The intended use case is to call this externally via `staticcall`. External calls to OptimizedAZTEC can be treated as pure functions as this contract contains no storage variables.


contract OptimizedAZTEC {
    /// @dev OptimizedAztec will take any transaction sent to it and attempt to validate a zero knowledge proof.
    /// If input parameters don't conform to the interface of OptimizedAZTECInterface then the transaction will throw.
    /// If the proof is not valid, the transaction will throw.
    /// @notice See OptimizedAZTECInterface for how method calls should be constructed.
    /// 'Cost' of raw elliptic curve primitives for a transaction: 160,700 gas + (124,500 * number of input notes) + (167,600 * number of output notes).
    /// For a basic 'joinSplit' with 2 inputs and 2 outputs = 744,900 gas.
    /// Solidity doesn't really do memory management - temporaries that are stored in memory are never overwritten. When working with elliptic curve points this causes kb of memory bloat.
    /// OptimizedAZTEC is written in IULIA to enable manual memory management and for other efficiency savings, relating to hashing and manipulating dynamic arrays.
    event Debug(uint);

    function() external payable {
        assembly {
            // not a payable function! Added `payable` keyword to remove some boilerplate generated by the compiler
            if callvalue {
                mstore(0x00, 0x404)
                revert(0x00, 0x20)
            }
            switch div(calldataload(0), 0x100000000000000000000000000000000000000000000000000000000)
            case 0x48036bf1 {       // "48036bf1": "validateCommit(uint256[6][],uint256,uint256,uint256[4])",
                validateCommit()
            }
            case 0x7dbb5f47 {       // "validateReveal(uint256[6][],uint256,uint256,uint256[4])"
                validateReveal()
            }
            case 0x471f6542 {       // "471f6542": "validateJoinSplit(uint256[6][],uint256[6][],uint256,uint256[4])",
                validateJoinSplit()
            }
            default {
                mstore(0x00, 404)
                return(0x00, 0x20)
            }


    // "48036bf1": "validateCommit(uint256[6][],uint256,uint256,uint256[4])",
    // "471f6542": "validateJoinSplit(uint256[6][],uint256[6][],uint256,uint256[4])",
    // "7dbb5f47": "validateReveal(uint256[6][],uint256,uint256,uint256[4])"
            // calldata map
            // 0x00 - 0x04 : function signature (the ABI expects this so here it is. We don't use it though)
            // 0x04 - 0x24 : calldata location of inputNotes dynamic array
            // 0x24 - 0x44 : calldata location of outputNotes dynamic array
            // 0x44 - 0x64 : Fiat-Shamir heuristic-ified random challenge `c`
            // 0x64 - 0x84 : t2_x1 (trusted setup pub key in G2, used in range proof and not hardcoded to allow for multiple trusted setups)
            // 0x84 - 0xa4 : t2_x2
            // 0xa4 - 0xc4 : t2_y1
            // 0xc4 - 0xe4 : t2_y2

            // memory map
            // 0x00 - 0x20 : commitment + blinding factor hash
            // 0x20 - 0x40 : commitment + blinding factor hash scratch space
            // 0x40 - 0x60 - point cache A x
            // 0x60 - 0x80 - point cache A y
            // 0x80 - 0xa0 - point cache A s
            // 0xa0 - 0xc0 - point cache B x
            // 0xc0 - 0xe0  - point cache B y
            // 0xe0 - 0x100 - point cache B s
            // 0x100 - 0x120 - point cache C x
            // 0x120 - 0x140 - point cache C y
            // 0x140 - 0x160 - point cache C s
            // 0x160 - 0x180 : pairing point A x
            // 0x180 - 0x1a0 : pairing point A y
            // 0x1c0 - 0x1e0 : pairing point B x
            // 0x200 - 0x220 : pairing point B y
            // 0x220 - 0x240 : point cache D x
            // 0x240 - 0x260 : point cache D y
            // 0x260 - 0x280 : point cache D s

            // structure of a 'Note' (uint[6])
            // 0x00 - 0x20 : k (zero knowledge representation of note value)
            // 0x20 - 0x40 : a (zero knowledge representation of note secret)
            // 0x40 - 0x60 : `gamma` (x-coordinate). `gamma` is the base point used to construct note commitment `sigma` and is also a BonehBoyen signature.
            // 0x60 - 0x80 : `gamma` (y-coordinate)
            // 0x80 - 0xa0 : `sigma` (x-coordinate). sigma = gamma^{k}.h^{a}
            // 0xa0 - 0xc0 : `sigma` (y-coordinate)
            /// @dev reveal function. Validates the AZTEC zero-knowledge reveal proof
            function validateReveal() {
                let gen_order := 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
                let field_order := 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47
                let inputNotes := add(0x04, calldataload(0x04))
                if iszero(validateCalldata(inputNotes, 0, 0x20)) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }
                let k := calldataload(0x44)
                let c := mod(calldataload(0x24), gen_order)
                let x := hashCommitments(inputNotes, 0)

                // we want to keep track of the sum of the signatures over k so we can validate the homomorphic equivalence of input and output commitments
                let kAccumulator

                // begin by evaluating the output notes as these require extra caching due to the range proof
                // start our iterator at the calldata index of the first element of the first output note
                let inputStart := add(inputNotes, 0x20) // we need this so cache it on the stack

                // calculate the number of bytes of calldata used by our outputNotes array and use to calculate endpoint
                // calldataload(outputNotes) = size of dynamic array. Each element contains 6 words (0xc0 bytes)
                let inputEnd := add(inputStart, mul(calldataload(inputNotes), 0xc0))
                for { let iterator := inputStart } lt(iterator, inputEnd) { iterator := add(iterator, 0xc0) } {
                    // check that the note commitments are on the right elliptic curve, and scalar elements are modulo the order of generator group G
                    validateCommitments(iterator)

                    // calculate the blinding factor associated with the note
                    evaluateNote(iterator, c, mod(x, gen_order))

                    // update kAccumulator by adding `k - c`. The `-c` is because `sigma` represents the encrypted value of the note, plus 1.
                    // The 1 is because we can't sign Boneh-Boyen signatures over 0.
                    kAccumulator := addmod(
                        kAccumulator,
                        addmod(
                            calldataload(iterator),
                            sub(gen_order, c),
                            gen_order
                        ),
                        gen_order
                    )

                    // fish out our new hash - `evaluateNote` will have placed it at 0x00
                    x := mload(0x00)
                }

                // We now have our cumulative hash in in location 0x00 - 0x20. We need to hash one final point, g^{kAccumulator}.
                // If the homomorphic sum of the inputs does NOT match that of the outputs, g^{kAccumulator} will be a function of `c`, the challenge.
                // We use g^{kAccumulator} as an input to our hash function to calculate `c`. For a malicious actor to 'fake' a proof where the homomorphic equivalence
                // relationship does not hold, they need to either find hash collisions in the keccak256 algorithm or solve the discrete logarithm problem for the altbn_128 curve.
                mstore(0x40, 1) // generator x-coordinate
                mstore(0x60, 2) // generator y-coordinate
                mstore(0x80, addmod(kAccumulator, sub(gen_order, mulmod(k, c, gen_order)), gen_order))
                // call bn128 multiplication precompile and shove the resulting point into memory indices 0x20 - 0x60
                if iszero(staticcall(gas, 7, 0x40, 0x60, 0x20, 0x40)) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }

                // calculate the challenge. This is the hash of the latest accumulated hash + our homomorphic sum blinding factor. Point is in correct memory indices so just store hash
                mstore(0x00, x)
                let challenge := mod(keccak256(0x00, 0x60), gen_order)
                // Finally, we've reconstructed the challenge. No gaurantees this is modulo the generator order of the altbn_128 curve,
                // so compare it against the original challenge provided by the transaction sender. These have to match. If the challenges match, then the commitments must hold to the proof statements
                // in the AZTEC paper. The hash is a function of the commitments and blinding factors - a malicious transaction sender cannot manipulate the commitments/blinding factors to not satisfy the proof
                // statement without triggering a hash-recalculation.
                if iszero(eq(challenge, calldataload(0x24))) {
                    mstore(0x00, 403) // Get outta here!
                    revert(0x00, 0x20)
                }
                // Everything is valid! Return true
                mstore(0x00, 0x01)
                return(0x00, 0x20)
            }

            /// @dev commit function. Validates the AZTEC zero-knowledge commit proof
            function validateCommit() {
                let gen_order := 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
                let field_order := 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47
                let outputNotes := add(0x04, calldataload(0x04))
                if iszero(validateCalldata(outputNotes, 0, 0x20)) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }
                let k := calldataload(0x44)
                let c := mod(calldataload(0x24), gen_order)
                let x := hashCommitments(outputNotes, 0)

                // we want to keep track of the sum of the signatures over k so we can validate the homomorphic equivalence of input and output commitments
                let kAccumulator

                // begin by evaluating the output notes as these require extra caching due to the range proof
                // start our iterator at the calldata index of the first element of the first output note
                let outputStart := add(outputNotes, 0x20) // we need this so cache it on the stack

                // calculate the number of bytes of calldata used by our outputNotes array and use to calculate endpoint
                // calldataload(outputNotes) = size of dynamic array. Each element contains 6 words (0xc0 bytes)
                let outputEnd := add(outputStart, mul(calldataload(outputNotes), 0xc0))
                for { let iterator := outputStart } lt(iterator, outputEnd) { iterator := add(iterator, 0xc0) } {
                    // check that the note commitments are on the right elliptic curve, and scalar elements are modulo the order of generator group G
                    validateCommitments(iterator)

                    // calculate the blinding factor associated with the note
                    evaluateNote(iterator, c, mod(x, gen_order))

                    // update kAccumulator by adding `k - c`. The `-c` is because `sigma` represents the encrypted value of the note, plus 1.
                    // The 1 is because we can't sign Boneh-Boyen signatures over 0.
                    kAccumulator := addmod(
                        kAccumulator,
                        addmod(
                            calldataload(iterator),
                            sub(gen_order, c),
                            gen_order
                        ),
                        gen_order
                    )

                    // the first note is treated differently - we don't want to roll the pairing points into homomorphic accumulators
                    // instead, the note commitments define the accumulators. Unrolling the loop is not ideal so tag the first instance
                    switch eq(iterator, outputStart)
                        case 1 {
                            // store gamma at 0x1e0
                            mstore(0x1e0, calldataload(add(iterator, 0x40)))
                            mstore(0x200, calldataload(add(iterator, 0x60)))
                            // store -sigma at 0x160
                            mstore(0x160, calldataload(add(iterator, 0x80)))
                            mstore(0x180, sub(field_order, calldataload(add(iterator, 0xa0))))
                        } 
                        default {
                            cachePairingPoints(iterator, c, mod(x, gen_order))
                        }
                    // fish out our new hash - `evaluateNote` will have placed it at 0x00
                    x := mload(0x00)
                }

                // We now have our cumulative hash in in location 0x00 - 0x20. We need to hash one final point, g^{kAccumulator}.
                // If the homomorphic sum of the inputs does NOT match that of the outputs, g^{kAccumulator} will be a function of `c`, the challenge.
                // We use g^{kAccumulator} as an input to our hash function to calculate `c`. For a malicious actor to 'fake' a proof where the homomorphic equivalence
                // relationship does not hold, they need to either find hash collisions in the keccak256 algorithm or solve the discrete logarithm problem for the altbn_128 curve.
                mstore(0x40, 1) // generator x-coordinate
                mstore(0x60, 2) // generator y-coordinate
                mstore(0x80, addmod(kAccumulator, sub(gen_order, mulmod(k, c, gen_order)), gen_order))
                // call bn128 multiplication precompile and shove the resulting point into memory indices 0x20 - 0x60
                if iszero(staticcall(gas, 7, 0x40, 0x60, 0x20, 0x40)) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }

                // calculate the challenge. This is the hash of the latest accumulated hash + our homomorphic sum blinding factor. Point is in correct memory indices so just store hash
                mstore(0x00, x)
                let challenge := mod(keccak256(0x00, 0x60), gen_order)
                // Finally, we've reconstructed the challenge. No gaurantees this is modulo the generator order of the altbn_128 curve,
                // so compare it against the original challenge provided by the transaction sender. These have to match. If the challenges match, then the commitments must hold to the proof statements
                // in the AZTEC paper. The hash is a function of the commitments and blinding factors - a malicious transaction sender cannot manipulate the commitments/blinding factors to not satisfy the proof
                // statement without triggering a hash-recalculation.
                if iszero(eq(challenge, calldataload(0x24))) {
                    mstore(0x00, 403) // Get outta here!
                    revert(0x00, 0x20)
                }

                // The final check is the bilinear pairing check to validate the range proof. The 'message' of each output note has to be within the proscribed range defined in the trusted setup
                // This is checked by validating that `gamma` is a randomized Boneh-Boyen signature that was signed by the trusted setup private key, `y`. We evaluate the following pairing check:
                // e(gamma, t2) ?= e(sigma, g2). t2 = g2^{y}, the trusted setup public key representation in G2.
                // We combine this relationship with part of the proof statement validated via `evaluateNote` (assuming the challenge hash matches): gamma^{k}.h^{a} = sigma.
                // If the pairing check holds, then gamma^{y} = sigma. In other words gamma^{k}.h^{a} = gamma^{y}.
                // As every group element is a generator of the group, we can re-write this as h^{kx}.h^{a} = h^{xy}, where `x` is a private scalar used to transform h to gamma.
                // Putting it all together, (kx + a = xy) => x = a / (y - k). This is a Boneh-Boyen signature over the message `-k`, signed by setup key `y`. Therefore the transaction sender
                // has provided a valid signature over an integer that was signed by the trusted setup private key and is therefore within the tolerated range
                // (this is because we didn't sign integers outside of the range. This is where the trusted part of the trusted setup comes in. Knowledge of `y` allows for arbitrary messages to be signed, it needs to be destroyed)
                // N.B. We can assume that, if the pairing check holds, the prover does not know how to transform gamma to h (because they don't know `y`).
                // This is what enables us to treat gamma^{k}.h^{a} as a Pedersen commitment.
                validatePairing(0x64)

                // Everything is valid! Return true
                mstore(0x00, 0x01)
                return(0x00, 0x20)
            }

            /// @dev joinSplit function. Validates the AZTEC zero-knowledge joinSplit proof
            /// @notice Scoped to a function block instead of being directly called so that we don't have namespacing problems with variable names
            function validateJoinSplit() {
                let gen_order := 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
                let field_order := 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47
                let inputNotes := add(0x04, calldataload(0x04))
                let outputNotes := add(0x04, calldataload(0x24))
                if iszero(validateCalldata(inputNotes, outputNotes, 0)) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }
                let c := mod(calldataload(0x44), gen_order)
                let x := hashCommitments(inputNotes, outputNotes)

                // we want to keep track of the sum of the signatures over k so we can validate the homomorphic equivalence of input and output commitments
                let kAccumulator

                // begin by evaluating the output notes as these require extra caching due to the range proof
                // start our iterator at the calldata index of the first element of the first output note
                let outputStart := add(outputNotes, 0x20) // we need this so cache it on the stack

                // calculate the number of bytes of calldata used by our outputNotes array and use to calculate endpoint
                // calldataload(outputNotes) = size of dynamic array. Each element contains 6 words (0xc0 bytes)
                let outputEnd := add(outputStart, mul(calldataload(outputNotes), 0xc0))
                for { let iterator := outputStart } lt(iterator, outputEnd) { iterator := add(iterator, 0xc0) } {
                    // check that the note commitments are on the right elliptic curve, and scalar elements are modulo the order of generator group G
                    validateCommitments(iterator)

                    // calculate the blinding factor associated with the note
                    evaluateNote(iterator, c, mod(x, gen_order))

                    // update kAccumulator by adding `k - c`. The `-c` is because `sigma` represents the encrypted value of the note, plus 1.
                    // The 1 is because we can't sign Boneh-Boyen signatures over 0.
                    kAccumulator := addmod(
                        kAccumulator,
                        addmod(
                            calldataload(iterator),
                            sub(gen_order, c),
                            gen_order
                        ),
                        gen_order
                    )

                    // the first note is treated differently - we don't want to roll the pairing points into homomorphic accumulators
                    // instead, the note commitments define the accumulators. Unrolling the loop is not ideal so tag the first instance
                    switch eq(iterator, outputStart)
                        case 1 {
                            // store gamma at 0x1e0
                            mstore(0x1e0, calldataload(add(iterator, 0x40)))
                            mstore(0x200, calldataload(add(iterator, 0x60)))
                            // store -sigma at 0x160
                            mstore(0x160, calldataload(add(iterator, 0x80)))
                            mstore(0x180, sub(field_order, calldataload(add(iterator, 0xa0))))
                        } 
                        default {
                            cachePairingPoints(iterator, c, mod(x, gen_order))
                        }
                    // fish out our new hash - `evaluateNote` will have placed it at 0x00
                    x := mload(0x00)
                }

                // Repeat for input notes
                let inputStart := add(inputNotes, 0x20)
                let inputEnd := add(inputStart, mul(calldataload(inputNotes), 0xc0))
                for { let iterator := inputStart } lt(iterator, inputEnd) { iterator := add(iterator, 0xc0) } {
                    validateCommitments(iterator)
                    evaluateNote(iterator, c, mod(x, gen_order))
                    // update kAccumulator. What does up, must come down. Subtract these values from the accumulator
                    kAccumulator := addmod(
                        kAccumulator,
                        addmod(
                            sub(gen_order, calldataload(iterator)),
                            c,
                            gen_order
                        ),
                        gen_order
                    )
                    // Update revolving hash `x`. Don't really need to do this for the input notes as these commitments are not involved in the pairing evaluation.
                    // But heyho, we constructed the proof this way and we need to be consistent
                    x := mload(0x00)
                }

                // We now have our cumulative hash in in location 0x00 - 0x20. We need to hash one final point, g^{kAccumulator}.
                // If the homomorphic sum of the inputs does NOT match that of the outputs, g^{kAccumulator} will be a function of `c`, the challenge.
                // We use g^{kAccumulator} as an input to our hash function to calculate `c`. For a malicious actor to 'fake' a proof where the homomorphic equivalence
                // relationship does not hold, they need to either find hash collisions in the keccak256 algorithm or solve the discrete logarithm problem for the altbn_128 curve.
                mstore(0x40, 1) // generator x-coordinate
                mstore(0x60, 2) // generator y-coordinate
                mstore(0x80, kAccumulator)
                // call bn128 multiplication precompile and shove the resulting point into memory indices 0x20 - 0x60
                if iszero(staticcall(gas, 7, 0x40, 0x60, 0x20, 0x40)) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }

                // calculate the challenge. This is the hash of the latest accumulated hash + our homomorphic sum blinding factor. Point is in correct memory indices so just store hash
                mstore(0x00, x)
                let challenge := mod(keccak256(0x00, 0x60), gen_order)
                // Finally, we've reconstructed the challenge. No gaurantees this is modulo the generator order of the altbn_128 curve,
                // so compare it against the original challenge provided by the transaction sender. These have to match. If the challenges match, then the commitments must hold to the proof statements
                // in the AZTEC paper. The hash is a function of the commitments and blinding factors - a malicious transaction sender cannot manipulate the commitments/blinding factors to not satisfy the proof
                // statement without triggering a hash-recalculation.
                if iszero(eq(challenge, calldataload(0x44))) {
                    mstore(0x00, 403) // Get outta here!
                    revert(0x00, 0x20)
                }

                // The final check is the bilinear pairing check to validate the range proof. The 'message' of each output note has to be within the proscribed range defined in the trusted setup
                // This is checked by validating that `gamma` is a randomized Boneh-Boyen signature that was signed by the trusted setup private key, `y`. We evaluate the following pairing check:
                // e(gamma, t2) ?= e(sigma, g2). t2 = g2^{y}, the trusted setup public key representation in G2.
                // We combine this relationship with part of the proof statement validated via `evaluateNote` (assuming the challenge hash matches): gamma^{k}.h^{a} = sigma.
                // If the pairing check holds, then gamma^{y} = sigma. In other words gamma^{k}.h^{a} = gamma^{y}.
                // As every group element is a generator of the group, we can re-write this as h^{kx}.h^{a} = h^{xy}, where `x` is a private scalar used to transform h to gamma.
                // Putting it all together, (kx + a = xy) => x = a / (y - k). This is a Boneh-Boyen signature over the message `-k`, signed by setup key `y`. Therefore the transaction sender
                // has provided a valid signature over an integer that was signed by the trusted setup private key and is therefore within the tolerated range
                // (this is because we didn't sign integers outside of the range. This is where the trusted part of the trusted setup comes in. Knowledge of `y` allows for arbitrary messages to be signed, it needs to be destroyed)
                // N.B. We can assume that, if the pairing check holds, the prover does not know how to transform gamma to h (because they don't know `y`).
                // This is what enables us to treat gamma^{k}.h^{a} as a Pedersen commitment.
                validatePairing(0x64)

                // Everything is valid! Return true
                mstore(0x00, 0x01)
                return(0x00, 0x20)
            }
                    
            /// @dev evaluate if e(P1, t2) . e(P2, g2) == 0.
            /// @notice we don't hard-code t2 so that contracts that call this library can use different trusted setups.
            function validatePairing(t2) {
                let field_order := 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47
                let t2_x_1 := calldataload(t2) // 0x464
                let t2_x_2 := calldataload(add(t2, 0x20))
                let t2_y_1 := calldataload(add(t2, 0x40))
                let t2_y_2 := calldataload(add(t2, 0x60))
                // check provided setup pubkey is not zero or g2
                if or(or(or(or(or(or(or(
                    iszero(t2_x_1),
                    iszero(t2_x_2)),
                    iszero(t2_y_1)),
                    iszero(t2_y_2)),
                    eq(t2_x_1, 0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed)),
                    eq(t2_x_2, 0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2)),
                    eq(t2_y_1, 0x12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa)),
                    eq(t2_y_2, 0x90689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b))
                {
                    mstore(0x00, 500)
                    revert(0x00, 0x20)
                }

                // store coords in memory
                // indices are a bit off, scipr lab's libff limb ordering (c0, c1) is opposite to what precompile expects
                // We can overwrite the memory we used previously as this function is called at the end of the validation routine.
                // Not overwriting the hash because...no idea, maybe I'll need it if we extend this algorithm.
                mstore(0x20, mload(0x160)) // sigma accumulator x
                mstore(0x40, mload(0x180)) // sigma accumulator y
                mstore(0x80, 0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed)
                mstore(0x60, 0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2)
                mstore(0xc0, 0x12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa)
                mstore(0xa0, 0x90689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b)
                mstore(0xe0, mload(0x1e0)) // gamma accumulator x
                mstore(0x100, mload(0x200)) // gamma accumulator y
                mstore(0x140, t2_x_1)
                mstore(0x120, t2_x_2)
                mstore(0x180, t2_y_1)
                mstore(0x160, t2_y_2)

                /*mstore(0x20, calldataload(0x184)) // sigma accumulator x
                mstore(0x40, calldataload(0x1a4)) // sigma accumulator y
                mstore(0x80, 0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed)
                mstore(0x60, 0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2)
                mstore(0xc0, 0x12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa)
                mstore(0xa0, 0x90689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b)
                mstore(0xe0, calldataload(0x144)) // gamma accumulator x
                mstore(0x100, sub(0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47, calldataload(0x164))) // gamma accumulator y
                mstore(0x140, t2_x_1)
                mstore(0x120, t2_x_2)
                mstore(0x180, t2_y_1)
                mstore(0x160, t2_y_2)*/
                let success := staticcall(gas, 8, 0x20, 0x180, 0x20, 0x20)

                if or(iszero(success), iszero(mload(0x20))) {
                    mstore(0x00, 400)
                    // revert(0x00, 0x20)
                }
            }

            /// @dev validate that the calldata provided conforms to the ABI.
            /// i.e. (uint[6][] inputNotes, uint[6][] outputNotes, uint challenge, uint[4] t2)
            /// @param inputNotes calldata location of inputNotes dynamic array (uint[6][])
            /// @param outputNotes calldata location of outputNotes dynamic array (uint[6][])
            function validateCalldata(inputNotes, outputNotes, delta) -> v {
                let expectedSize := add(0xa4, delta)
                if inputNotes {
                    expectedSize := add(add(expectedSize, mul(calldataload(inputNotes), 0xc0)), 0x40)
                }
                if outputNotes {
                    expectedSize := add(add(expectedSize, mul(calldataload(outputNotes), 0xc0)), 0x40)
                }
                v := eq(expectedSize, calldatasize)
            }

            /// @dev check that this note's points are on the altbn128 curve(y^2 = x^3 + 3)
            /// and that signatures 'k' and 'a' are modulo the order of the curve. Transaction will throw if this is not the case.
            /// @notice x^3 is modulo the field order, but if x^3 + 3 extends beyond the field order, then this function will reject the commitments and revert the transaction.
            /// The chances of this occurring randomly are considerably less than an extinction-event meteor hitting Earth in the next 50 years, so we don't check for it and save 10 gas per call.
            /// If you encounter this level of cosmic bad fortune I suggest you regenerate your blinding factors and calculate a new hash. And purchase some life insurance.
            /// @param note the calldata loation of the note
            function validateCommitments(note) {
                let k := calldataload(note)
                let a := calldataload(add(note, 0x20))
                let gen_order := 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
                let field_order := 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47
                let gammaX := calldataload(add(note, 0x40))
                let gammaY := calldataload(add(note, 0x60))
                let sigmaX := calldataload(add(note, 0x80))
                let sigmaY := calldataload(add(note, 0xa0))
                if iszero(
                    and(
                        and(
                            eq(mod(a, gen_order), a), // a is modulo generator order?
                            eq(mod(k, gen_order), k)  // k is modulo generator order?
                        ),
                        and(
                            eq( // y^2 ?= x^3 + 3
                                add(mulmod(sigmaX, mulmod(sigmaX, sigmaX, field_order), field_order), 3),
                                mulmod(sigmaY, sigmaY, field_order)
                            ),
                            eq( // y^2 ?= x^3 + 3
                                add(mulmod(gammaX, mulmod(gammaX, gammaX, field_order), field_order), 3),
                                mulmod(gammaY, gammaY, field_order)
                            )
                        )
                    )
                ) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }
            }

            /// @dev Update the pairing point accumulators for `gamma` and `sigma`.
            /// We assume `evaluateNote` has already been called, and `sigma^{-cx}` is at memory location 0x120-0x160
            /// @notice `gamma` accumulator is at memory location 0x220. `sigma` accumulator is at memory location 0x160-0x1a0
            /// @param note the calldata location of the note
            /// @param c the Fiat-Shamir heuristic-ified random challenge
            /// @param x revolving commitment hash
            function cachePairingPoints(note, c, x) {
                // Instead of calculating two bilinear mappings for every output note, we want to combine each size of the pairing equation into one single point
                // and validate the pairing by calculating two bilinear mappings in total
                // For the first output note, we collect gamma and -sigma
                // For subsequent notes we want to collect gamma^(cx) and -sigma^(cx)
                
                // 'validateNote' MUST be executed before this function, so that -sigma^(cx) is in memory location (0x120 - 0x160)
                mstore(0x220, calldataload(add(note, 0x40)))
                mstore(0x240, calldataload(add(note, 0x60)))
                mstore(0x260, mulmod(c, x, 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001))
                let result := staticcall(gas, 6, 0x120, 0x80, 0x160, 0x40)
                result := and(result, staticcall(gas, 7, 0x220, 0x60, 0x220, 0x40))
                result := and(result, staticcall(gas, 6, 0x1e0, 0x80, 0x1e0, 0x40))
                if iszero(result) {
                    mstore(0x00, 400)
                    // revert(0x00, 0x20)
                }
            }

            /// @dev Calculate the keccak256 hash of the commitments for both input notes and output notes.
            /// This is used both as an input to validate the challenge `c` and also to generate pseudorandom relationships
            /// between commitments for different outputNotes, so that we can combine them into a single multi-exponentiation for the purposes of validating the bilinear pairing relationships.
            /// @notice The hash is calculated iteratively. e.g. x = keccak256(x, gamma_x[i], gamma_y[i], sigma_x[i], sigma_y[i])
            /// @param inputNotes calldata location of input notes
            /// @param outputNotes calldata location of output notes
            /// @return v the calculated hash
            function hashCommitments(inputNotes, outputNotes) -> v {
                // get locations of inputNotes and outputNotes in calldata
                mstore(0x00, 0x00) // just in case...

                // we want to store gamma and sigma coordinates in memory and hash them
                // gamma_x, gamma_y, sigma_x, sigma_y are all stored consecutively in calldata,
                // 0x40 bytes away from the start of the relevant note array
                // we want to iterate over each note array, and combine the note coordinates into our commitment hash
                // Start iterating at the first location of <gamma_x>.
                // Offset is 0x60 because inputNotes points to start of dynamic array: first word is array length
                let i := add(inputNotes, 0x60)
                // Endpoint is <size of dynamic array * number of bytes in each static array> + i
                // Static array size = 6 = 192 bytes = 0xc0
                let end := add(mul(calldataload(inputNotes), 0xc0), i)
                for {} lt(i, end) { i := add(i, 0xc0) } {
                    calldatacopy(0x20, i, 0x80)
                    // hash from index 0x00 and store result in index 0x00 so hash auto-updates
                    mstore(0x00, keccak256(0x00, 0xa0))
                }
                if outputNotes {
                    // Repeat process for output notes
                    i := add(outputNotes, 0x60)
                    end := add(mul(calldataload(outputNotes), 0xc0), i)
                    for {} lt(i, end) { i := add(i, 0xc0) } {
                        calldatacopy(0x20, i, 0x80)
                        mstore(0x00, keccak256(0x00, 0xa0))
                    }
                }
                v := mload(0x00) // load hash and return on stack
            }

            /// @dev Calculates the blinding factor associated with the note and adds it into the cumulative hash.
            /// B = gamma^{kx}.h^{rx}.sigma^{-cx}
            /// x = commitment hash. Used so that we can re-use sigma^{-cx} in bilinear pairing check if needed, saves an exponentiation per note.
            /// @notice We use static memory maps to reduce gas cost of calculations. See `main` for more information.
            /// @param note the calldata location of the note
            /// @param c the Fiat-Shamir heuristic-ified random challenge
            /// @param x hash of the commitments (hashed again for each round of iteration)
            function evaluateNote(note, c, x) {
                let gen_order := 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
                mstore(0x100, calldataload(add(note, 0x80))) // sigma_x
                mstore(0x120, sub(0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47, calldataload(add(note, 0xa0)))) // -sigma_y
                mstore(0x140, mulmod(c, x, gen_order)) // cx

                mstore(0x40, calldataload(add(note, 0x40))) // gamma_x
                mstore(0x60, calldataload(add(note, 0x60))) // gamma_y
                mstore(0x80, mulmod(calldataload(note), x, gen_order)) // kx

                mstore(0xa0, 6483851876951186340299698915131841524257417305942095255806178259056825531140) // h_x
                mstore(0xc0, 5007075189070983654636859883510741442756570786515348039503723406517378975219) // h_y
                mstore(0xe0, mulmod(calldataload(add(note, 0x20)), x, gen_order)) // ax

                let result := staticcall(gas, 7, 0x100, 0x60, 0x120, 0x40)
                result := and(result, staticcall(gas, 7, 0xa0, 0x60, 0xe0, 0x40))
                result := and(result, staticcall(gas, 7, 0x40, 0x60, 0x40, 0x40))
                result := and(result, staticcall(gas, 6, 0xe0, 0x80, 0x80, 0x40))
                result := and(result, staticcall(gas, 6, 0x40, 0x80, 0x20, 0x40))

                // Update our cumulative hash. The accumulated point is in 0x20 - 0x60. Hash is in 0x00 - 0x20. For the first invokation of evaluateNote, `x` will be in 0x00, which is used
                // as our base hash. When we're finished the final hash will incorporate all of the committed points and each calculated blinding factor.
                mstore(0x00, keccak256(0x00, 0x60))

                if iszero(result) {
                    // revert(0x00, 0x00)
                }
            }
        }
    }
}