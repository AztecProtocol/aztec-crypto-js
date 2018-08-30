pragma solidity ^0.4.20;

// ######################################################################################
// Title: Non-Interactive Zero-Knowledge anonymous note protocol validator smart contract
// Author: Zachary Williamson
// Confidential and not for public release
// 
// Disclaimer: This is a technical demo, use at your own risk!
// ######################################################################################

contract NizkInterface { // swap ABI with this when using Nizk as a contract
    function validateSplitTx(bytes32[39]) external pure returns (bytes32[19]) {}
    function validateJoinTx(bytes32[23]) external pure returns (bytes32[19]) {}
    function validateCommitTx(bytes32[6]) external pure returns (bytes32[7]) {}
    function validateRedeemTx(bytes32[10]) external pure returns (bytes32[7]) {}
    function DEBUG_eccMul(bytes32[3]) external pure returns (bytes32[2]) {}
    function DEBUG_eccAdd(bytes32[4]) external pure returns (bytes32[2]) {}
    function DEBUG_pairing(bytes32[8]) external pure returns (bytes32) {}
}

library NizkInterfaceLibrary { // swap ABI this when using Nizk as a library
    function validateSplitTx(bytes32[39]) external pure returns (bytes32[19]) {}
    function validateJoinTx(bytes32[23]) external pure returns (bytes32[19]) {}
    function validateCommitTx(bytes32[6]) external pure returns (bytes32[7]) {}
    function validateRedeemTx(bytes32[10]) external pure returns (bytes32[7]) {}
    function DEBUG_eccMul(bytes32[3]) external pure returns (bytes32[2]) {}
    function DEBUG_eccAdd(bytes32[4]) external pure returns (bytes32[2]) {}
    function DEBUG_pairing(bytes32[8]) external pure returns (bytes32) {}
}

contract Nizk {
    function () public {
        assembly {
            // ### FUNCTION SELECTOR
            // -------------------------------------------------------------------
            switch getFunctionSelector()
                case 0x75d34641 {   // "validateSplitTx(bytes32[39]) external"
                    validateSplitTx()
                }
                case 0xacc8cecd {   // "validateJoinTx(bytes32[23]) external"
                    validateJoinTx()
                }
                case 0x814fba66 {   // "validateRedeemTx(bytes32[10]) external"
                    validateRedeemTx()
                }
                case 0x91036ec8 {   // "validateCommitTx(bytes32[6]) external"
                    validateCommitTx()
                }
                case 0x003ec6b9 {   // "DEBUG_eccMul(bytes32[3]) external"
                    let m := mload(0x40)
                    eccMul(calldataload(0x04), calldataload(0x24), calldataload(0x44), m)
                    return(m, 0x40)
                }
                case 0x06a791d0 {   // "DEBUG_eccAdd(bytes32[4]) external"
                    let m := mload(0x40)
                    calldatacopy(m, 0x04, 0x80)
                    eccCombine(m)
                    return(m, 0x40)
                }
                case 0xdda62ba5 {   // "DEBUG_pairing(bytes32[8]) external"
                    let m := mload(0x40)
                    calldatacopy(m, 0x04, 0x80)
                    validatePairing(m, 0x84)
                    return(m, 0x20)
                }
                default {
                    mstore(0x0, 404) // hey! there's nothing here!
                    revert(0x0, 0x20)
                }
            // -------------------------------------------------------------------
            // multiply point (x, y) by 's', store result in 'r'
            function eccMul(x, y, s, r) {
                let m := mload(0x40)
                mstore(m, x)
                mstore(add(m, 0x20), y)
                mstore(add(m, 0x40), s)
                if iszero(staticcall(not(0), 7, m, 0x60, r, 0x40)) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }
            }
            // add 2 points stored consecutively at 'm', store result in 'm'
            function eccCombine(m) {
                if iszero(staticcall(not(0), 6, m, 0x80, m, 0x40)) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }
            }
            // evaluate if e(P1, g2y) . e(P2, g2) == 0
            function validatePairing(points, g2y) {
                let field_order := 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47
                let g2y_x_1 := calldataload(g2y) // 0x464
                let g2y_x_2 := calldataload(add(g2y, 0x20))
                let g2y_y_1 := calldataload(add(g2y, 0x40))
                let g2y_y_2 := calldataload(add(g2y, 0x60))
                // check provided setup pubkey is not zero or g2
                if or(or(or(or(or(or(or(
                    iszero(g2y_x_1),
                    iszero(g2y_x_2)),
                    iszero(g2y_y_1)),
                    iszero(g2y_y_2)),
                    eq(g2y_x_1, 0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed)),
                    eq(g2y_x_2, 0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2)),
                    eq(g2y_y_1, 0x12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa)),
                    eq(g2y_y_2, 0x90689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b))
                {
                    mstore(0x00, 500)
                    revert(0x00, 0x20)
                }
                let x_1 := mload(points)
                let y_1 := mload(add(points, 0x20))
                let x_2 := mload(add(points, 0x40))
                let y_2 := mload(add(points, 0x60))

                // store coords in memory
                // indices are a bit off, scipr lab's libff limb ordering (c0, c1) is opposite to what precompile expects
                let m := mload(0x40)
                mstore(m, x_1)
                mstore(add(m, 0x20), y_1)
                mstore(add(m, 0x60), 0x1800deef121f1e76426a00665e5c4479674322d4f75edadd46debd5cd992f6ed)
                mstore(add(m, 0x40), 0x198e9393920d483a7260bfb731fb5d25f1aa493335a9e71297e485b7aef312c2)
                mstore(add(m, 0xa0), 0x12c85ea5db8c6deb4aab71808dcb408fe3d1e7690c43d37b4ce6cc0166fa7daa)
                mstore(add(m, 0x80), 0x90689d0585ff075ec9e99ad690c3395bc4b313370b38ef355acdadcd122975b)
                mstore(add(m, 0xc0), x_2)
                mstore(add(m, 0xe0), y_2)
                mstore(add(m, 0x120), g2y_x_1)
                mstore(add(m, 0x100), g2y_x_2)
                mstore(add(m, 0x160), g2y_y_1)
                mstore(add(m, 0x140), g2y_y_2)
                let success := staticcall(not(0), 8, m, 0x180, m, 0x20)
                if or(iszero(success), iszero(mload(m))) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }
            }

            function validateCommitTx() {
                // calldata map
                // 0x00 - 0x04: function signature
                // 0x04 - 0x24: address of sender
                // 0x24 - 0x64: s_1
                // 0x64 - 0x84: k (public)
                // 0x84 - 0xa4: b_1 (signature)
                // 0xa4 - 0xc4: c (hash)
                let gen_order := 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
                let field_order := 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47
                let c := calldataload(0xa4)
                let o := 0x84
                let pointCache := mload(0x40)
                mstore(0x40, add(pointCache, 0x80)) // reserve 4 words of memory
                if iszero(eq(calldatasize, 0xc4)) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }

                // ### calculate g^{b_{1}}.s_{1}^{-c.x_{1}} = B
                let x := calldataload(0x24)
                let y := calldataload(0x44)
                checkWellFormed(x, y)

                eccMul(x, sub(field_order, y), c, pointCache)
                eccMul(1, 2, sig_b1(o), add(pointCache, 0x40))
                eccCombine(pointCache)

                // ### validate B
                mstore(add(pointCache, 0x60), mload(pointCache))
                mstore(add(pointCache, 0x80), mload(add(pointCache, 0x20)))
                calldatacopy(pointCache, 0x04, 0x60)
                // memory map:
                // 0x00 - 0x20: message sender
                // 0x20 - 0x60: s_{1}
                // 0x60 - 0xa0: B
                let result := keccak256(pointCache, 0xa0)
                if eq(result, c) {
                    // calculate and store c: g^{k}.s_{1}
                    eccMul(1, 2, sig_k(o), add(pointCache, 0x20))
                    mstore(add(pointCache, 0x60), x)
                    mstore(add(pointCache, 0x80), y)
                    eccCombine(add(pointCache, 0x20))
                    // store d: g
                    mstore(add(pointCache, 0x60), 0x1)
                    mstore(add(pointCache, 0x80), 0x2)
                    // store s
                    calldatacopy(add(pointCache, 0xa0), 0x24, 0x40)
                    mstore(pointCache, 0x1)
                    return(pointCache, 0xe0)
                }

                mstore(0x00, 403)
                revert(0x00, 0x20)
            }

            function validateRedeemTx() {
                // calldata map
                // 0x00 - 0x04: function signature
                // 0x04 - 0x24: address of sender
                // 0x24 - 0xe4: c_1, d_1, s_1
                // 0xe4 - 0x104: k (public)
                // 0x104 - 0x124: b_1 (signature)
                // 0x124 - 0x144: c (hash)

                let gen_order := 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
                let field_order := 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47
                let c := calldataload(0x124)
                let o := 0x104 // offset to get signature
                let runningHash := hashInputs(0x100) // 3 points + sender address + k = 8 words, 256 (0x100) bytes

                let pointCache := mload(0x40)
                mstore(0x40, add(pointCache, 0x80)) // reserve 4 words of memory

                if iszero(eq(calldatasize, 0x144)) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }

                // ### calculate s_{1}^{-c.x_{1}}
                let gScalar := mulmod(runningHash, sig_b1(o), gen_order)
                let x, y := s1()
                eccMul(x, sub(field_order, y), mulmod(runningHash, c, gen_order), pointCache)
                runningHash := advanceHash(runningHash)

                // ### calculate c_{1}^{-c.x_{2}}
                gScalar := addmod(gScalar, mulmod(c, mulmod(runningHash, sig_k(o), gen_order), gen_order), gen_order)
                x, y := c1()
                eccMul(x, sub(field_order, y), mulmod(runningHash, c, gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)

                x, y := d1()
                eccMul(x, y, mulmod(runningHash, sig_b1(o), gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)

                // ### calculate generator exponentiation
                // exponent: b_{1}.x_{1} + k.c.x_{2}
                eccMul(1, 2, gScalar, add(pointCache, 0x40))
                eccCombine(pointCache) // get resulting point, the blinding factor

                // validate calculated blinding factor B was provided as an input into original hash 'c'
                // memory map:
                // 0x00 - 0x20: B.x
                // 0x20 - 0x40: B.y
                // 0x40 - 0x60: x_{2}
                mstore(add(pointCache, 0x40), runningHash)
                let result := keccak256(pointCache, 0x60)
                if eq(result, c) {
                    calldatacopy(add(pointCache, 0x20), 0x24, 0xe0)
                    mstore(pointCache, 0x1)
                    return(pointCache, 0xe0)
                }
                mstore(0x00, 403)
                revert(0x00, 0x20)
            }
            function validateJoinTx() {
                // calldata map
                // 0x00 - 0x04: function signature
                // 0x04 - 0x24: address of sender. Could get via 'caller' but would rely on contract being called via delegateCall
                // 0x24 - 0xe4: c_1, d_1, s_1 (input note a)
                // 0xe4 - 0x1a4: c_2, d_2, s_1 (input note a)
                // 0x1a4 - 0x264: c_3, d_3, s_3 (output note b)
                // 0x264 - 0x2c4: b_1, b_2, a_3 (signatures)
                // 0x2c4 - 0x2e4: c (hash)
                let gen_order := 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
                let field_order := 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47
                let c := calldataload(0x2c4)
                let o := 0x264 // offset to get signatures
                let runningHash := hashInputs(0x260) // 9 points + sender address = 19 words, 608 (0x260) bytes
                let pointCache := mload(0x40)
                mstore(0x40, add(pointCache, 0xc0)) // reserve 6 words of memory
                if iszero(eq(calldatasize, 0x2e4)) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }

                // ### calculate s_{1}^{-c.x_{1}}
                let gScalar := mulmod(runningHash, sig_b1(o), gen_order)
                let x, y := s1()
                eccMul(x, sub(field_order, y), mulmod(runningHash, c, gen_order), pointCache)
                runningHash := advanceHash(runningHash)

                // ### calculate s_{2}^{-c.x_{2}}
                gScalar := addmod(gScalar, mulmod(runningHash, sig_b2(o), gen_order), gen_order)
                x, y := s2()
                eccMul(x, sub(field_order, y), mulmod(runningHash, c, gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)
                runningHash := advanceHash(runningHash)

                // ### calculate d_{3}^{-c.x_{3}}
                gScalar := addmod(gScalar, mulmod(runningHash, sig_a3(o), gen_order), gen_order)
                x, y := d3()
                eccMul(x, sub(field_order, y), mulmod(runningHash, c, gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)
                runningHash := advanceHash(runningHash)

                // ### calculate (c_{1}.c_{2}.c_{3}^{-1})^{-c.x_{4}}
                x, y := c1()
                mstore(add(pointCache, 0x40), x)
                mstore(add(pointCache, 0x60), sub(field_order,y))
                x, y := c2()
                mstore(add(pointCache, 0x80), x)
                mstore(add(pointCache, 0xa0), sub(field_order,y))
                eccCombine(add(pointCache, 0x40))
                x, y := c3()
                mstore(add(pointCache, 0x80), x)
                mstore(add(pointCache, 0xa0), y)
                eccCombine(add(pointCache, 0x40))
                
                x := mload(add(pointCache, 0x40))
                y := mload(add(pointCache, 0x60))
                eccMul(x, y, mulmod(runningHash, c, gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)

                // ### calculate d_{1}^{b_{1}.x_{4}}
                x, y := d1()
                eccMul(x, y, mulmod(runningHash, sig_b1(o), gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)

                // ### calculate d_{2}^{b_{2}.x_{4}}
                x, y := d2()
                eccMul(x, y, mulmod(runningHash, sig_b2(o), gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)
                
                // ### calculate s_{3}^{-a_{3}.x_{4}}
                x, y := s3()
                eccMul(x, sub(field_order, y), mulmod(runningHash, sig_a3(o), gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)

                // ### calculate generator exponentiation
                // exponent: b_{1}.x_{1} + b_{2}.x_{2} + a_{3}.x_{3}
                eccMul(1, 2, gScalar, add(pointCache, 0x40))
                eccCombine(pointCache) // get resulting point, the blinding factor

                // validate calculated blinding factor B was provided as an input into original hash 'c'
                // memory map:
                // 0x00 - 0x20: B.x
                // 0x20 - 0x40: B.y
                // 0x40 - 0x60: x_{4}
                mstore(add(pointCache, 0x40), runningHash)
                let result := keccak256(pointCache, 0x60)
                if eq(result, c) {
                    calldatacopy(add(pointCache, 0x20), 0x24, 0x240)
                    mstore(pointCache, 0x1)
                    return(pointCache, 0x260)
                }
                mstore(0x00, 403)
                revert(0x00, 0x20)
            }
            function validateSplitTx() {
                // calldata map:
                // 0x00 - 0x04: function signature
                // 0x04 - 0x24: address of sender. Could get via 'caller' but would rely on contract being called via delegateCall
                // 0x24 - 0xe4: c_1, d_1, s_1 (input note)
                // 0xe4 - 0x1a4: c_2, d_2, s_1 (output note a)
                // 0x1a4 - 0x264: c_3, d_3, s_3 (output note b)
                // 0x264 - 0x2e4: gamma_1, sigma_1 (bb sigs for note a)
                // 0x2e4 - 0x364: gamma_2, sigma_2 (bb sigs for note b)
                // 0x364 - 0x444: b_1, a_2, a_3, k_2, k_3, r_2, r_3 (signatures)
                // 0x444 - 0x464: c (hash)
                // 0x464 - 0x4a4: g2y_x
                // 0x4a4 - 0x4e4: g2y_y
                if iszero(eq(calldatasize, 0x4e4)) { // assert calldatasize is correct
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }
                let gen_order := 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001
                let field_order := 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47
                let c := calldataload(0x444)
                let o := 0x364 // offset in calldata to get signature
                let runningHash := hashInputs(0x360) // 13 points + sender address = 27 words, 864 (0x360) bytes
                let pointCache := mload(0x40)
                mstore(0x40, add(pointCache, 0xc0)) // reserve 12 words of memory
                // total memory use 28 words: 12 + 12 words for pairing + initial memory reserved by solitity (4 words)

                // validate bilinear pairing between gamma_{1}, gamma_{2} and sigma_{1}, sigma_{2}
                // we can re-use calculated sigma values in Sigma protocol
                let x, y := sigma1()
                eccMul(x, sub(field_order, y), mulmod(runningHash, c, gen_order), pointCache)
                x, y := gamma1()
                eccMul(x, y, mulmod(runningHash, c, gen_order), add(pointCache, 0x80))
                let temp := runningHash // cache old hash, needed for gamma_1^{-k_{2}}
                runningHash := advanceHash(runningHash)

                x, y := sigma2()
                eccMul(x, sub(field_order, y), mulmod(runningHash, c, gen_order), add(pointCache, 0x40))
                // memory map:
                // 0x00-0x40: sigma_{1}^{cx_1}
                // 0x40-0x80: sigma_{2}^{cx_2}
                // 0x80-0xc0: gamma_{1}^{cx_1}
                eccCombine(pointCache) // add sigma_{1}, sigma_{2} together at index 0x00

                x, y := gamma2()
                eccMul(x, y, mulmod(runningHash, c, gen_order), add(pointCache, 0x40))
                eccCombine(add(pointCache, 0x40)) // add gamma_{1}, gamma_{2} together at index 0x40

                // memory map: 
                // 0x00-0x40: sigma_{1}^{cx_1} + sigma_{2}^{cx_2}
                // 0x40-0x80: gamma_{1}^{cx_1} + gamma_{2}^{cx_2}
                x := mload(pointCache)
                y := mload(add(pointCache, 0x20))
                validatePairing(pointCache, 0x464) // 464 is offset in calldata to get g2y

                // add sigma_{1}^(cx_1) + sigma_{2}^(cx_2) back into memory
                mstore(pointCache, x)
                mstore(add(pointCache, 0x20), y)

                // ### calculate gamma_1^{-k_{2}.x_{1}}.gamma_2^{-k_{3}.x_{2}}
                let gScalar := mulmod(temp, sig_r1(o), gen_order)
                x, y := gamma1()
                eccMul(x, sub(field_order, y), mulmod(temp, sig_k2(o), gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)
                gScalar := addmod(gScalar, mulmod(runningHash, sig_r2(o), gen_order), gen_order)
                x, y := gamma2()
                eccMul(x, sub(field_order, y), mulmod(runningHash, sig_k3(o), gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)

                runningHash := advanceHash(runningHash)

                // ### calculate s_{1}^{-c.x_{3}}
                gScalar := addmod(gScalar, mulmod(runningHash, sig_b1(o), gen_order), gen_order)
                x, y := s1()
                eccMul(x, sub(field_order, y), mulmod(runningHash, c, gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)
                runningHash := advanceHash(runningHash)

                // ### calculate d_{2}^{-c.x_{4}}
                gScalar := addmod(gScalar, mulmod(runningHash, sig_a2(o), gen_order), gen_order)
                x, y := d2()
                eccMul(x, sub(field_order, y), mulmod(runningHash, c, gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)
                runningHash := advanceHash(runningHash)

                // ### calculate d_{3}^{-c.x_{5}}
                gScalar := addmod(gScalar, mulmod(runningHash, sig_a3(o), gen_order), gen_order)
                x, y := d3()
                eccMul(x, sub(field_order, y), mulmod(runningHash, c, gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)
                runningHash := advanceHash(runningHash)

                // ### calculate (c_{2}.g)^{-c.x_{6}}.s_{2}^{a_{2}.x_{6}}
                gScalar := addmod(gScalar, mulmod(runningHash, sig_k2(o), gen_order), gen_order)
                x, y := c2()
                mstore(add(pointCache, 0x40), x)
                mstore(add(pointCache, 0x60), y)
                mstore(add(pointCache, 0x80), 1)
                mstore(add(pointCache, 0xa0), 2)
                eccCombine(add(pointCache, 0x40))
                x := mload(add(pointCache, 0x40))
                y := mload(add(pointCache, 0x60))
                eccMul(x, sub(field_order, y), mulmod(runningHash, c, gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)

                x, y := s2()
                eccMul(x, y, mulmod(runningHash, sig_a2(o), gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)
                runningHash := advanceHash(runningHash)

                // ### calculate (c_{3}.g)^{-c.x_{7}}.s_{3}^{a_{3}.x_{7}}
                gScalar := addmod(gScalar, mulmod(runningHash, sig_k3(o), gen_order), gen_order)
                x, y := c3()
                mstore(add(pointCache, 0x40), x)
                mstore(add(pointCache, 0x60), y)
                mstore(add(pointCache, 0x80), 1)
                mstore(add(pointCache, 0xa0), 2)
                eccCombine(add(pointCache, 0x40))
                x := mload(add(pointCache, 0x40))
                y := mload(add(pointCache, 0x60))
                eccMul(x, sub(field_order, y), mulmod(runningHash, c, gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)

                x, y := s3()
                eccMul(x, y, mulmod(runningHash, sig_a3(o), gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)
                runningHash := advanceHash(runningHash)

                // ### calculate (c_{1}.g)^{-c.x_{8}}.d_{1}^{b_{1}.x_{8}}
                gScalar := addmod(gScalar, mulmod(runningHash, sig_k2(o), gen_order), gen_order)
                gScalar := addmod(gScalar, mulmod(runningHash, sig_k3(o), gen_order), gen_order)
                x, y := c1()
                mstore(add(pointCache, 0x40), x)
                mstore(add(pointCache, 0x60), y)
                mstore(add(pointCache, 0x80), 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd3)  // 2G
                mstore(add(pointCache, 0xa0), 0x15ed738c0e0a7c92e7845f96b2ae9c0a68a6a449e3538fc7ff3ebf7a5a18a2c4)
                eccCombine(add(pointCache, 0x40))
                x := mload(add(pointCache, 0x40))
                y := mload(add(pointCache, 0x60))
                eccMul(x, sub(field_order, y), mulmod(runningHash, c, gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)
                x, y := d1()
                eccMul(x, y, mulmod(runningHash, sig_b1(o), gen_order), add(pointCache, 0x40))
                eccCombine(pointCache)

                // ### calculate generator exponentiation
                // exponent: r_{1}.x_{1} + r_{2}.x_{2} + b_{1}.x_{3} + a_{2}.x_{4} + a_{3}.x_{5} + k_{2}.(x_{6} + x_{8}) + k_{3}.(x_{7} + x_{8})
                eccMul(1, 2, gScalar, add(pointCache, 0x40))
                eccCombine(pointCache) // get resulting point, the blinding factor

                // validate calculated blinding factor B was provided as an input into original hash 'c'
                // memory map:
                // 0x00 - 0x20: B.x
                // 0x20 - 0x40: B.y
                // 0x40 - 0x60: x_{8}
                mstore(add(pointCache, 0x40), runningHash)
                let result := keccak256(pointCache, 0x60)
                if eq(result, c) {
                    calldatacopy(add(pointCache, 0x20), 0x24, 0x240)
                    mstore(pointCache, 0x1)
                    return(pointCache, 0x260)
                }
                mstore(0x00, 403)
                revert(0x00, 0x20)
            }

            function getFunctionSelector() -> v {
                v := div(calldataload(0), 0x100000000000000000000000000000000000000000000000000000000)
            }

            function hashInputs(commitmentSize) -> v {
                // copy from bytes 0x04
                calldatacopy(mload(0x40), 0x04, commitmentSize)
                v := keccak256(mload(0x40), commitmentSize)
            }

            function advanceHash(h) -> r {
                mstore(0x00, h)
                r := keccak256(0x00, 0x20)
            }

            // Can't reference constants with inline assembly and don't want to directly ref calldata offsets so...yeesh
            function c1() -> px, py {
                px := calldataload(0x24)
                py := calldataload(0x44)
                checkWellFormed(px, py)
            }
            function d1() -> px, py {
                px := calldataload(0x64)
                py := calldataload(0x84)
                checkWellFormed(px, py)
            }
            function s1() -> px, py {
                px := calldataload(0xa4)
                py := calldataload(0xc4)
                checkWellFormed(px, py)
            }
            function c2() -> px, py {
                px := calldataload(0xe4)
                py := calldataload(0x104)
                checkWellFormed(px, py)
            }
            function d2() -> px, py {
                px := calldataload(0x124)
                py := calldataload(0x144)
                checkWellFormed(px, py)
            }
            function s2() -> px, py {
                px := calldataload(0x164)
                py := calldataload(0x184)
                checkWellFormed(px, py)
            }
            function c3() -> px, py {
                px := calldataload(0x1a4)
                py := calldataload(0x1c4)
                checkWellFormed(px, py)
            }
            function d3() -> px, py {
                px := calldataload(0x1e4)
                py := calldataload(0x204)
                checkWellFormed(px, py)
            }
            function s3() -> px, py {
                px := calldataload(0x224)
                py := calldataload(0x244)
                checkWellFormed(px, py)
            }
            function gamma1() -> px, py {
                px := calldataload(0x264)
                py := calldataload(0x284)
                checkWellFormed(px, py)
            }
            function sigma1() -> px, py {
                px := calldataload(0x2a4)
                py := calldataload(0x2c4)
                checkWellFormed(px, py)
            }
            function gamma2() -> px, py {
                px := calldataload(0x2e4)
                py := calldataload(0x304)
                checkWellFormed(px, py)
            }
            function sigma2() -> px, py {
                px := calldataload(0x324)
                py := calldataload(0x344)
                checkWellFormed(px, py)
            }
            function checkWellFormed(px, py) {
                let p := 0x30644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd47
                // assert point is on bn_128 curve y^{2} = x^{3} + 3
                if iszero(eq(addmod(mulmod(mulmod(px, px, p), px, p), 3, p), mulmod(py, py, p))) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }
            }
            function sig_k(offset) -> v {
                v := calldataload(sub(offset, 0x20))
            }
            function sig_b1(offset) -> v {
                v := loadSignature(offset)
            }
            function sig_b2(offset) -> v {
                v := loadSignature(add(offset, 0x20))
            }
            function sig_a2(offset) -> v {
                v := loadSignature(add(offset, 0x20))
            }
            function sig_a3(offset) -> v {
                v := loadSignature(add(offset, 0x40))
            }
            function sig_k2(offset) -> v {
                v := loadSignature(add(offset, 0x60))
            }
            function sig_k3(offset) -> v {
                v := loadSignature(add(offset, 0x80))
            }
            function sig_r1(offset) -> v {
                v := loadSignature(add(offset, 0xa0))
            }
            function sig_r2(offset) -> v {
                v := loadSignature(add(offset, 0xc0))
            }
            function loadSignature(location) -> v {
                v := calldataload(location)
                if iszero(and(iszero(iszero(v)), eq(v, mod(v, 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001)))) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }
            }
        }
    }
}