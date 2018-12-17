pragma solidity ^0.4.24;

import "./AZTEC.sol";
import "../ERC20/ERC20.sol";

/**
* @title  AZTEC token, providing a confidential representation of an ERC20 token 
* @author Zachary Williamson, CreditMint
* Copyright Creditmint 2018. All rights reserved. This is a technical demo! Use at your own risk!
* We plan to release AZTEC as an open-source protocol that provides transaction privacy for Ethereum.
* This will include our bespoke AZTEC decentralized exchange, allowing for cross-asset transfers with full transaction privacy.
* Stay tuned for updates!
**/
contract AZTECERC20BridgeAsm {
    mapping(bytes32 => address) public noteRegistry;
    bytes32[4] setupPubKey;
    bytes32 domainHash;
    ERC20 token;
    event Created(bytes32 domainHash, address contractAddress);
    event ConfidentialTransfer();

    /// @dev Set the trusted setup public key, the address of the AZTEC verification smart contract and the ERC20 token we're linking to
    constructor(bytes32[4] _setupPubKey, address _token, uint256 _chainId) public {
        setupPubKey = _setupPubKey;
        token = ERC20(_token);
        // calculate the EIP712 domain hash, for hashing structured data
        bytes32 _domainHash;
        assembly {
            let m := mload(0x40)
            mstore(m, 0x8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f) // "EIP712Domain(string name, string version, uint256 chainId, address verifyingContract)"
            mstore(add(m, 0x20), 0x60d177492a60de7c666b3e3d468f14d59def1d4b022d08b6adf554d88da60d63) // name = "AZTECERC20BRIDGE_DOMAIN"
            mstore(add(m, 0x40), 0x28a43689b8932fb9695c28766648ed3d943ff8a6406f8f593738feed70039290) // version = "0.1.1"
            mstore(add(m, 0x60), _chainId) // chain id
            mstore(add(m, 0x80), address) // verifying contract
            _domainHash := keccak256(m, 0xa0)
        }
        domainHash = _domainHash;
        emit Created(_domainHash, this);
    }

 /*   * This transaction takes ```m``` input notes and ```n - m``` output notes (where n = notes.length)
    * commitment of value 'kPublic' (located at notes[notes.length][0]). ```notes```, ```m``` and ```challenge``` constitute an AZTEC zero-knowledge
    * proof that is checked by the AZTEC validator smart contract.
    * If the proof is valid, then the sum of the values of the input notes is equal to the sum of the values of the output notes, plus kPublic.
    * \sum_{i=0}^{m-1}k_i = \sum_{i=m}^{n-1}k_i + k_{public} (mod p)
    * Non-zero values of ```kPublic``` represent ERC20 tokens being converted to/from AZTEC note form.
    * Positive values of ```kPublic``` imply a conversion from ERC20 tokens to AZTEC form, negative values imply a conversion from AZTEC notes to public ERC20 tokens
    * (care should be taken that 'negative' here means integers greater than p/2, where p is the order of the bn128 generator group)
    * For example, one could issue a confidentialTransaction with 0 input notes, 10 output notes and kPublic = -10,000.
    * If a satisfying zero-knowledge proof is provided, then we know with confidence that the values encrypted by the output notes sum to 10,000,
    * but we have no idea how those tokens are distributed across the notes.
    * Each output note has a value bounded by the AZTEC commitment scheme's range proof.
    * Calldata Map
    * 0x04:0x24      = notes
    * 0x24:0x44      = m
    * 0x44:0x64      = challenge
    * 0x64:0x84      = inputSignatures
    * 0x84:0xa4      = outputOwners
    * 0xa4:0xc4      = metadata
    * When note owners are assigned to stealth addresses, 'metadata' should contain an ephemeral public key that will enable note owner to identify their note
*/
    function confidentialTransfer(bytes32[6][], uint, uint, bytes32[3][], address[], bytes) external {
        uint kPublic;

        assembly {
            let mem := mload(0x40)
            let ownerStart := add(calldataload(0x84), 0x24) // offset in calldata to outputOwners array
            let signatureStart := add(calldataload(0x64), 0x24)
            let n := calldataload(add(calldataload(0x04), 0x04))
            let m := calldataload(0x24)
            // Validate that inputSignatures.length == m and notes.length == outputSignatures.length + m
            if iszero(and(
                eq(calldataload(sub(signatureStart, 0x20)), m),
                eq(add(m, calldataload(sub(ownerStart, 0x20))), n)
            )) { mstore(0x00, 400) revert(0x00, 0x20) }

            /**
            *   Validate AZTEC zero-knowledge proof
            *   Construct required calldata map for AZTEC.sol
            *   0x00:0x04       = function signature (0x00)
            *   0x04:0x24       = location of notes[6][] array
            *   0x24:0x44       = m
            *   0x44:0x64       = challenge
            *   0x64:0x84       = t2.x.c0 (trusted setup public key)
            *   0x84:0xa4       = t2.x.c1
            *   0xa4:0xc4       = t2.y.c0
            *   0xc4:0xe4       = t2.y.c1
            *   0xe4...         = notes[6][] array
            **/
            mstore(add(mem, 0x04), 0xe0)
            calldatacopy(add(mem, 0x24), 0x24, 0x40)
            mstore(add(mem, 0x64), 0x01cf7cc93bfbf7b2c5f04a3bc9cb8b72bbcf2defcabdceb09860c493bdf1588d)
            mstore(add(mem, 0x84), 0x08d554bf59102bbb961ba81107ec71785ef9ce6638e5332b6c1a58b87447d181)
            mstore(add(mem, 0xa4), 0x204e5d81d86c561f9344ad5f122a625f259996b065b80cbbe74a9ad97b6d7cc2)
            mstore(add(mem, 0xc4), 0x02cb2a424885c9e412b94c40905b359e3043275cd29f5b557f008cd0a3e0c0dc)
            calldatacopy(add(mem, 0xe4), 0xc4, sub(signatureStart, 0xe4))

            // if result == 0 then proof is invalid.
            if iszero(
                delegatecall(gas, AZTECInterface, mem, signatureStart, mem, 0x20)
            ) { mstore(0x00, 403) revert(0x00, 0x20) }

            /**
            *   Determine validity of input/output notes and remove/add into note registry
            *   For each input note:
            *       validate that the note is signed by the note owner
            *       validate that the note exists in the note registry
            *   For each output note:
            *       validate that the note does not exist in the note registry
            *
            *   Note signature is EIP712 signature over the following struct
            *   struct AZTEC_NOTE_SIGNATURE {
            *       bytes32[4] note;
            *       uint256 challenge;
            *       address sender;    
            *   };
            *
            *   Memory Map (from ```mem```):
            *   0x00:0x20       = struct type hash "AZTEC_NOTE_SIGNATURE(bytes32[4] note,uint256 challenge,address sender)"
            *   0x20:0x40       = hash of note coordinates (\gamma_x, \gamma_y, \sigma_x, \sigma_y)
            *   0x40:0x60       = AZTEC zero-knowledge proof challenge
            *   0x60:0x80       = msg.sender
            *
            *   We hash memory block mem:(mem+0x80) to create our struct hash
            *
            *   To get our signature message, we hash "\0x1901" + EIP712 domain hash + struct hash
            *   0x9c:0xa0       = "0x1901"
            *   0xa0:0xc0       = domain hash
            *   0xc0:0xe0       = struct hash
            *
            *   We hash memory block (mem+0x9c):(mem+0xe0) to get our signature message.
            *   To extract signature address, we call ecrecover(message, inputSignatures[i][0], inputSignatures[i][1], inputSignatures[i][2])
            *   0xe0:0x100      = signature message
            *   0x100:0x120     = ecdsa signature parameter v
            *   0x120:0x140     = ecdsa signature parameter r
            *   0x140:0x160     = ecdsa signature parameter s
            *
            *   We set fixed values in memory before iterating over each note
            **/
            mstore(mem, 0x0f1ea84c0ceb3ad2f38123d94a164612e1a0c14a694dc5bfa16bc86ea1f3eabd)
            mstore(add(mem, 0x40), calldataload(0x44)) // challenge
            mstore(add(mem, 0x60), caller)
            mstore(add(mem, 0x80), 0x1901)
            mstore(add(mem, 0xa0), sload(domainHash_slot))
            mstore(0x20, noteRegistry_slot)
            for { let i := 0 } lt(i, n) { i:= add(i, 0x01) } {
                let noteHash := keccak256(add(add(mem, 0x144), mul(i, 0xc0)), 0x80)
                mstore(0x00, noteHash)
                let key := keccak256(0x00, 0x40) // get storage key for noteRegistry[noteHash]

                switch lt(i, m) // are we dealing with an input note or an output note?
                case 1 { // input note
                    mstore(add(mem, 0x20), noteHash)
                    mstore(add(mem, 0xc0), keccak256(mem, 0x80))
                    mstore(add(mem, 0xe0), keccak256(add(mem, 0x9e), 0x42))
                    mstore(add(mem, 0x100), and(calldataload(add(signatureStart, mul(i, 0x60))), 0xff))
                    calldatacopy(add(mem, 0x120), add(add(signatureStart, mul(i, 0x60)), 0x20), 0x40)

                    // call ecdsarecover precompile, put result in 0x00
                    if iszero(staticcall(gas, 0x01, add(mem, 0xe0), 0x80, 0x00, 0x20)) {
                        mstore(0x00, 400) revert(0x00, 0x20)
                    }

                    // throw if ecdsarecover fails or noteRegistry[noteHash] !== address of signer
                    if iszero(and(eq(sload(key), mload(0x00)), gt(mload(0x00), 0))) { mstore(0x00, 400) revert(0x00, 0x20) }
                    sstore(key, 0) // remove note from noteRegistry
                }
                case 0 { // output note
                    if sload(key) { mstore(0x00, 400) revert(0x00, 0x20) }
                    sstore(
                        key,
                        and(
                            calldataload(add(ownerStart, mul(sub(i, m), 0x20))),
                            0xffffffffffffffffffffffffffffffffffffffff
                        )
                    ) // add note into note registry
                }
            }

            // extract kPublic from input data. If this value is not zero then transaction sender is converting ERC20 tokens to/from AZTEC note form
            kPublic := calldataload(sub(signatureStart, 0xe0))
            if gt(kPublic, 0) {
                switch gt(kPublic, 10944121435919637611123202872628637544274182200208017171849102093287904247808)
                    case 1 { // conversion of (p - kPublic) erc20 tokens into AZTEC note form
                        mstore(mem, 0x23b872dd) // function signature of "transferFrom(address,uint256)"
                        mstore(add(mem, 0x20), caller)
                        mstore(add(mem, 0x40), address)
                        mstore(add(mem, 0x60), sub(21888242871839275222246405745257275088548364400416034343698204186575808495617, kPublic))
                        if iszero(
                            call(gas, sload(token_slot), 0, add(mem, 0x1c), 0x64, mem, 0x20)
                        ) { mstore(0x00, 400) revert(0x00, 0x20) }
                    }
                    case 0 { // convertion of kPublic AZTEC note value into erc20 tokens
                        mstore(mem, 0xa9059cbb) // function signature of "transfer(address,uint256)"
                        mstore(add(mem, 0x20), caller)
                        mstore(add(mem, 0x40), kPublic)
                        if iszero(
                            call(gas, sload(token_slot), 0, add(mem, 0x1c), 0x44, 0x00, 0x20)
                        ) { mstore(0x00, 400) revert(0x00, 0x20) }
                    }
            }
        }
        emit ConfidentialTransfer();
    }
}