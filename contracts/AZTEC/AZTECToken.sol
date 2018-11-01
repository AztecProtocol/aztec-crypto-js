pragma solidity ^0.4.23;

import "./ECDSA.sol";
import "./AZTEC.sol";
import "../ERC20/ERC20.sol";

contract AZTECToken {

    mapping(bytes32 => address) noteRegistry;
    bytes32[4] setupPubKey;
    address verifier;
    ERC20 token;
    address AZTEC;

    uint constant GROUP_MODULUS_BOUNDARY = 10944121435919637611123202872628637544274182200208017171849102093287904247808; // good luck reaching this...
    uint constant GROUP_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint globalConfidentialBalance = 0;
    bytes32 domainHash;
    event Created(bytes32 domainHash, address contractAddress);
    constructor(bytes32[4] _setupPubKey, address _verifier, address _token) public {
        setupPubKey = _setupPubKey;
        verifier = _verifier;
        token = ERC20(_token);
        bytes32 _domainHash;
        assembly {
            let m := mload(0x40)
            mstore(m, 0x8d4b25bfecb769291b71726cd5ec8a497664cc7292c02b1868a0534306741fd9)
            mstore(add(m, 0x20), 0xc3fd9f27ca734f9ed0520121549fd2ed350619d246773431f7247f60bd774ee2) // name = "AZTEC_RINKEBY_DOMAIN"
            mstore(add(m, 0x40), 0x25130290f410620ec94e7cf11f1cdab5dea284e1039a83fa7b87f727031ff5f4) // version = "0.1.0"
            mstore(add(m, 0x60), 4) // chain id
            mstore(add(m, 0x80), 0x210db872dec2e06c375dd40a5a354307bb4ba52ba65bd84594554580ae6f0639)
            mstore(add(m, 0xa0), address) // verifying contract
            _domainHash := keccak256(m, 0xc0)
        }
        domainHash = _domainHash;
        emit Created(_domainHash, this);
    }

  
    function DEBUG_addNote(bytes32 noteHash, address noteOwner) public {
        noteRegistry[noteHash] = noteOwner; // TODO, remove after testing!
    }
    // function hashInputNotes(uint[3][] inputSignatures, bytes32[6][] inputNotes, uint challenge) view internal returns (bytes32[] memory) {
    //     bytes32[] memory inputNoteHashes = new bytes32[](inputNotes.length);
    //     for (uint i = 0; i < inputNotes.length; i++) {
    //             address owner = ECDSA.recover(bytes32(inputSignatures[i][0]), uint8(inputSignatures[i][1]), bytes32(inputSignatures[i][2]), bytes32(challenge));
    //             bytes32 noteHash = getNoteHash(inputNotes[i][2], inputNotes[i][3], inputNotes[i][4], inputNotes[i][5], owner);
    //             require(noteRegistry[noteHash] == true);
    //             inputNoteHashes[i] = noteHash;
    //     }
    //     return inputNoteHashes;
    // }

    // function hashOutputNotes(address[] outputNoteOwners, bytes32[6][] outputNotes) view internal returns (bytes32[] memory) {
    //     bytes32[] memory outputNoteHashes = new bytes32[](outputNotes.length);
    //     for (uint i = 0; i < outputNotes.length; i++) {
    //             bytes32 outputNoteHash = getNoteHash(outputNotes[i][2], outputNotes[i][3], outputNotes[i][4], outputNotes[i][5], outputNoteOwners[i]);
    //             require(noteRegistry[outputNoteHash] == false);
    //             outputNoteHashes[i] = outputNoteHash;
    //     }
    //     return outputNoteHashes;
    // }

    event ConfidentialTransaction(bytes, bytes, uint);

    function validateInputNote(bytes32[6] note, bytes32[3] signature, uint challenge, bytes32 domainHash) public view returns (bytes32[3] compressedNote) {
        bytes32 noteHash;
        bytes32 signatureMessage;
        assembly {
            let m := mload(0x40)
            mstore(m, mload(add(note, 0x40)))
            mstore(add(m, 0x20), mload(add(note, 0x60)))
            mstore(add(m, 0x40), mload(add(note, 0x80)))
            mstore(add(m, 0x60), mload(add(note, 0xa0)))
            noteHash := keccak256(m, 0x80)
            mstore(m, 0x1aba5d08f7cd777136d3fa7eb7baa742ab84001b34c9de5b17d922fc2ca75cce)
            mstore(add(m, 0x20), noteHash)
            mstore(add(m, 0x40), challenge)
            mstore(add(m, 0x60), caller)
            mstore(add(m, 0x40), keccak256(m, 0x80))
            mstore(add(m, 0x20), domainHash)
            mstore(m, 0x1901)
            signatureMessage := keccak256(add(m, 0x1e), 0x42)
            mstore(m, 0x0)
            mstore(add(m, 0x20), 0x0)
            mstore(add(m, 0x40), 0x0)
            mstore(add(m, 0x60), 0x0)
            mstore(add(m, 0x80), 0x0)
        }
        address owner = ecrecover(signatureMessage, uint8(signature[0]), signature[1], signature[2]);
        require(noteRegistry[noteHash] == owner, "expected input note to exist in registry");
       //  noteRegistry[noteHash] = 0;
        compressedNote[0] = bytes32(uint(note[2]) | uint((bool(uint(note[3]) & 1 == 1) ? 0x8000000000000000000000000000000000000000000000000000000000000000 : 0x0)));
        compressedNote[1] = bytes32(uint(note[4]) | uint((bool(uint(note[5]) & 1 == 1) ? 0x8000000000000000000000000000000000000000000000000000000000000000 : 0x0)));
        compressedNote[2] = bytes32(owner);
    }

    function validateOutputNote(bytes32[6] note, address owner) public returns (bytes32[3] compressedNote) {
        bytes32 noteHash;
        assembly {
            let m := mload(0x40)
            mstore(m, mload(add(note, 0x40)))
            mstore(add(m, 0x20), mload(add(note, 0x60)))
            mstore(add(m, 0x40), mload(add(note, 0x80)))
            mstore(add(m, 0x60), mload(add(note, 0xa0)))
            noteHash := keccak256(m, 0x80)
        }
        require(noteRegistry[noteHash] == 0, "expected output note to not exist in registry");
        noteRegistry[noteHash] = owner;
        compressedNote[0] = bytes32(uint(note[2]) | (uint(note[3]) & 1) * 0x8000000000000000000000000000000000000000000000000000000000000000);
        compressedNote[1] = bytes32(uint(note[4]) | uint((bool(uint(note[5]) & 1 == 1) ? 0x8000000000000000000000000000000000000000000000000000000000000000 : 0x0)));
        compressedNote[2] = bytes32(owner);
    }

    function confidentialTransfer(bytes32[6][] notes, uint m, uint challenge, bytes32[3][] inputSignatures, address[] outputOwners) external {
        require(inputSignatures.length == m, "input signature length invalid");
        require(inputSignatures.length + outputOwners.length == notes.length, "array length mismatch");

        require(AZTECInterface(verifier).validateJoinSplit(notes, m, challenge, setupPubKey), "proof not valid!");
        uint value = uint(notes[notes.length - 1][0]);
        if (value > GROUP_MODULUS_BOUNDARY) {
            require(token.transferFrom(msg.sender, this, GROUP_MODULUS - value), "token transfer from user failed!");
        }

        bytes32[3][] memory compressedInputNotes = new bytes32[3][](inputSignatures.length);
        bytes32[3][] memory compressedOutputNotes = new bytes32[3][](outputOwners.length);

        for (uint i = 0; i < m; i++) {
            compressedInputNotes[i] = validateInputNote(notes[i], inputSignatures[i], challenge, domainHash);
        }
        for (i = 0; i < notes.length - m; i++) {
            compressedOutputNotes[i] = validateOutputNote(notes[i + m], outputOwners[i]);
        }
        if (value < GROUP_MODULUS_BOUNDARY) {
            // a redemption, do this last
            require(token.transfer(msg.sender, value), "token transfer to user failed!");
        }
        // TODO. Figure out what to do here. Truffle is throwing decoder errors when I use bytes32 arrays...
        emit ConfidentialTransaction(abi.encode(compressedInputNotes), abi.encode(compressedOutputNotes), value);
    }
    // calldata map
    // 0x04:0x24            = calldata location of notes
    // 0x24:0x44            = m
    // 0x44:0x64            = challenge
    // 0x64:0x84            = calldata location of signatures
    // 0x84:0xa4            = calldata loation of outputOwners
   /* function confidentialTransfer2(uint[6][], uint, uint, uint[3][], address[]) external {
        assembly {
            let n := calldataload(add(calldataload(0x04), 0x04))
            let m := add(mload(0x40), 0x44)
            // m - 0x04         = function signature (000000000)
            // m - m+0x20       = start in new calldata of notes
            // m+0x20 - m+0x40       = m
            // m+0x40:m+0x60    = challenge
            // m+0x60:m+0xe0    = setupPubKey
            // m+0xe0:m+0x100   = start of note array
            mstore(m, 0xe0)
            calldatacopy(add(m, 0x20), 0x24, 0x40)
            mstore(add(m, 0x60), sload(setupPubKey_slot))
            mstore(add(m, 0x80), sload(add(setupPubKey_slot, 0x01)))
            mstore(add(m, 0xa0), sload(add(setupPubKey_slot, 0x02))) 
            mstore(add(m, 0xc0), sload(add(setupPubKey_slot, 0x03)))
            calldatacopy(add(m, 0xe0), add(calldataload(0x04), 0x04), mul(n, 0xc0))
            let result := staticcall(gas, sload(validator_slot), sub(m, 0x04), add(mul(n, 0xc0), 0xe4), m, 0x20)
            if iszero(and(result, mload(m))) {
                mstore(0x00, 403)
                revert(0x00, 0x20)
            }

            // now that we have validated the zero knowledge proof, we need to validate the signatures
            let noteStart := add(m, 0x100)
            let mProof := calldataload(0x24)
            let noteData := add(add(m, 0x140), mul(n, 0xc0))
            let domainHash := sload(domainHash_slot)
            let signaturesStart := calldataload(add(calldataload(0x64), 0x04))
            // iterate over the input notes
            for { let i := 0 } lt(i, add(mProof, 1)) { i := add(i, 0x01) } {
                // we have a note at position noteStart + (i*0xc0)
                // gammaX will be two words ahead of this position
                let index := add(noteStart, mul(i, 0xc0))
                mstore(sub(index, 0x1e), 0x1901) // store sig values 0x1901
                mstore(index, domainhash)
                mstore(add(index, 0x20), 0x9438534985345) // struct hash (TODO actually get)
                let noteHash := keccak256(add(index, 0x40), 0x80)
                mstore(add(noteData, mul(i, 0x40)), keccak256(add(index, 0x40), 0x80)) // store note hash
                mstore(add(index, 0xc0), calldataload(0x44))
                mstore(add(index, 0xe0), caller)
                mstore(add(index, 0x20), keccak256(add(index, 0x20), 0xe0)) // hash data and struct hash
                mstore(index, keccak256(sub(index, 0x02), 0x42)) // and hash this with the domain hash
                
                calldatacopy(add(index, 0x20), add(signaturesStart, mul(i, 0x60)), 0x60) // copy v r s siganture params
                result := staticcall(gas, 0x01, index, 0x80, index, 0x20) // and get address
                if iszero(result) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }
                mstore(add(index, 0x40), noteRegistry_slot)
                mstore(add(index, 0x20), noteHash)
                let key := keccak256(add(index, 0x20), 0x40)
                let noteOwner := sload(key)
                if iszero(eq(noteOwner, mload(index))) {
                    mstore(0x00, 403)
                    revert(0x00, 0x20)
                }
                sstore(key, 0) // destroy the note
                mstore(add(add(noteData, 0x20), mul(i, 0x40)), noteOwner)
            }
            let addressStart := sub(calldataload(add(calldataload(0x84), 0x04)), mul(mProof, 0x20))
            for { i := add(mProof, 0x01) } lt(i, n) { i := add(i, 0x01) } {
                // output notes
                let noteHash := keccak256(add(index, 0x40), 0x80)
                mstore(m, noteRegistry_slot)
                mstore(add(m, 0x20), noteHash)
                let key := keccak256(m, 0x40)
                if sload(key) {
                    mstore(0x00, 403)
                    revert(0x00, 0x20)
                }
                let noteOwner := calldataload(add(addressStart, mul(i, 0x20)))
                sstore(key, noteOwner)
                mstore(add(noteData, mul(i, 0x40)), noteHash)
                mstore(add(add(noteData, 0x20), mul(i, 0x40)), noteOwner)
            }
            mstore(sub(noteData, 0x20), n)
            
            let value := calldataload(add(noteStart, sub(mul(n, 0xc0), 0xe0)))
            switch gt(value, 0x23445345345345345)
            case 1 {
                value := sub(0x3454363452453245, value)    
                // this represents a withdrawal
                if gt(value, sload(globalConfidentialSupply_slot)) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20) // this should NOT happen!
                }
                mstore(m, 0x000005345345) // token.transfer function signature
                mstore(add(m, 0x20), caller)
                mstore(add(m, 0x40), value)
                result := staticcall(gas, sload(token_slot), add(m, 0x1c), 0x44, m, 0x20)
                if iszero(and(result, mload(m))) {
                    mstore(0x00, 0x400)
                    revert(0x00, 0x20)
                }
            }// p/2 
            case 0 {
                mstore(m, 0x3e4943564563) // token.transferFrom function signature
                mstore(add(m, 0x20), caller)
                mstore(add(m, 0x40), address)
                mstore(add(m, 0x60), value)
                result := staticcall(gas, slot(token_slot), add(m, 0x1c), 0x64, m, 0x20)
                if iszero(and(result, mload(m))) {
                    mstore(0x00, 0x400)
                    revert(0x00, 0x20)
                }
            }
            let end := add(noteData, mul(m, 0x40))
            // iterate over input notes
            for { i := noteData } lt(i, end) { i := add(i, 0x40) } {

            }
            // mstore(m, add(noteData, mul(n, 0x40)))
        }

    }

                /// 0x04:0x24       = calldata location of start of ```note``` dynamic array
            /// 0x24:0x44       = m, which defines the index separator between input notes ando utput notes
            /// 0x44:0x64       = Fiat-Shamir heuristicified random challenge
            /// 0x64:0xe4       = G2 element t2, the trusted setup public key
            /// 0xe4:0x104      = start of ```note``` dynamic array, contains the size of the array (```n```)

    function confidentialTransfer(uint[6][] notes, uint m, uint challenge, uint[3][] inputSignatures, address[] outputOwners) external {
        // bytes32[] memory inputNoteHashes = hashInputNote
        require(inputSignatures.length == m, "invalid length of input signatures");
        require(outputOwners.length == notes.length - m, "invalid length of output owners");

        require(AZTEC.validateJoinSplit(notes, m, challenge, setupPubKey) == 1, "zero-knowledge proof validation failed!");

        uint value = notes[notes.length][0];
        if (value != 0) {
            if (value > GROUP_MODULUS_BOUNDARY) {
                value = GROUP_MODULUS - value;
                require(token.balanceOf(this) >= value, "contract token balance insufficient!");
                globalConfidentialBalance -= value;
                token.transfer(msg.sender, value);
            } else {
                require(token.balanceOf(msg.sender) >= value, "sender balance insufficient!");
                require(token.transferFrom(msg.sender, this, value) == true, "token transfer from msg.sender failed");
                globalConfidentialBalance += value;
            }
        }

        // address owner;
        // bytes32 noteHash;
        // for (uint i = 0; i < inputSignatures.length; i++) {
        //     assembly {
        //         let m := mload(0x40)
        //         mstore(m, sload(domainHash_slot))
        //         mstore(add(m, 0x20), 0x234234) // struct type hash
        //         calldatacopy(add(m, 0x40), add(add(notes, 0x60), mul(i, 0xc0)), 0x80) // notes

        //     }
        //     (owner, noteHash) = hashInputNote(inputSignatures[i], notes[i], m, challenge);
        //     require(noteRegistry[noteHash] == owner);
        //     noteRegistry[noteHash] = 0;
        // }
        // for (uint j = 0; j < outputOwners.length; j++) {
        //     (owner, noteHash) = hashOutputNote(outputOwners[i], notes[i+m], m, challenge);
        //     require(noteRegistry[noteHash] == 0);
        //     noteRegistry[noteHash] = owner;
        // }
    }
    // function joinSplitTransaction(uint[3][] inputSignatures, address[] outputNoteOwners, bytes32[6][] inputNotes, bytes32[6][] outputNotes, uint challenge) external {
    //     require(inputSignatures.length == inputNotes.length);
    //     bytes32[] memory inputNoteHashes = hashInputNotes(inputSignatures, inputNotes, challenge);
    //     bytes32[] memory outputNoteHashes = hashOutputNotes(outputNoteOwners, outputNotes);
    
    //     OptimizedAZTECInterface optimizedAZTEC = OptimizedAZTECInterface(verifier);
    //     if (optimizedAZTEC.validateJoinSplit(inputNotes, outputNotes, challenge, setupPubKey)) {
    //         for (uint i = 0; i < inputNoteHashes.length; i++) {
    //             noteRegistry[inputNoteHashes[i]] = false;
    //         }
    //         for (uint j = 0; j < outputNoteHashes.length; j++) {
    //             noteRegistry[outputNoteHashes[j]] = true;
    //         }
    //     }
    // }
    */
}