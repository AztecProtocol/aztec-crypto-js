pragma solidity ^0.4.23;

import "./AZTEC.sol";
import "../ERC20/ERC20.sol";

/// @title Contract that uses the AZTEC protocol to create a confidential representation of an existing ERC20 token
/// @author Zachary Williamson, CreditMint
/// @dev All rights reserved. This is a technical demo! Use at your own risk!
contract AZTECERC20Bridge {
    uint constant GROUP_MODULUS_BOUNDARY = 10944121435919637611123202872628637544274182200208017171849102093287904247808;
    uint constant GROUP_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    mapping(bytes32 => address) public noteRegistry;
    bytes32[4] setupPubKey;
    bytes32 domainHash;
    AZTECInterface verifier;
    ERC20 token;

    event Created(bytes32 domainHash, address contractAddress);
    event ConfidentialTransaction(bytes, bytes, uint);

    /// @dev Set the trusted setup public key, the address of the AZTEC verification smart contract and the ERC20 token we're linking to
    constructor(bytes32[4] _setupPubKey, address _verifier, address _token) public {
        setupPubKey = _setupPubKey;
        verifier = AZTECInterface(_verifier);
        token = ERC20(_token);
        // calculate the EIP712 domain hash, for hashing structured data
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

    /// @dev validate that an input note A: exists and B: the owner has signed against this transaction
    /// Each note owner must sign an 'AZTEC_NOTE_SIGNATURE' struct of the following composition
    /// struct AZTEC_NOTE_SIGNATURE {
    ///     bytes32[4] note
    ///     uint256 challenge
    ///     address sender
    /// };
    /// where sender = msg.sender. This is included in the signature to prevent a signature (and proof) being used maliciously in another transaction
    /// by signing against the proof challenge, the signer is signing an implicit acceptance of the transaction outputs
    function validateInputNote(bytes32[6] note, bytes32[3] signature, uint challenge, bytes32 domainHashTemp) public returns (bytes32[3] compressedNote) {
        bytes32 noteHash;
        bytes32 signatureMessage;
        assembly {
            let m := mload(0x40)
            mstore(m, mload(add(note, 0x40)))
            mstore(add(m, 0x20), mload(add(note, 0x60)))
            mstore(add(m, 0x40), mload(add(note, 0x80)))
            mstore(add(m, 0x60), mload(add(note, 0xa0)))
            noteHash := keccak256(m, 0x80)
            mstore(m, 0x1aba5d08f7cd777136d3fa7eb7baa742ab84001b34c9de5b17d922fc2ca75cce) // keccak256 hash of "AZTEC_NOTE_SIGNATURE(bytes32[4] note,uint256 challenge,address sender)"
            mstore(add(m, 0x20), noteHash)
            mstore(add(m, 0x40), challenge)
            mstore(add(m, 0x60), caller)
            mstore(add(m, 0x40), keccak256(m, 0x80))
            mstore(add(m, 0x20), domainHashTemp)
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
        noteRegistry[noteHash] = 0;
        compressedNote[0] = bytes32(uint(note[2]) | (uint(note[3]) & 1) * 0x8000000000000000000000000000000000000000000000000000000000000000);
        compressedNote[1] = bytes32(uint(note[4]) | (uint(note[5]) & 1) * 0x8000000000000000000000000000000000000000000000000000000000000000);
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
        compressedNote[1] = bytes32(uint(note[4]) | (uint(note[5]) & 1) * 0x8000000000000000000000000000000000000000000000000000000000000000);
        compressedNote[2] = bytes32(owner);
    }

    /// @dev validate a confidential transaction. This transaction takes 'm' input notes and 'n - m' output notes (where n = notes.length), along with a public
    /// commitment of value 'kPublic' (located at notes[notes.length][0]). ```notes```, ```m``` and ```challenge``` constitute an AZTEC zero-knowledge
    /// proof that is checked by the AZTEC validator smart contract.
    /// If the proof is valid, then the sum of the values of the input notes is equal to the sum of the values of the output notes, plus kPublic.
    /// \sum_{i=0}^{m-1}k_i = \sum_{i=m}^{n-1}k_i + k_{public} (mod p)
    /// Non-zero values of ```kPublic``` represent ERC20 tokens being converted to/from AZTEC note form.
    /// Positive values of ```kPublic``` imply a conversion from ERC20 tokens to AZTEC form, negative values imply a conversion from AZTEC notes to public ERC20 tokens
    /// (care should be taken that 'negative' here means integers greater than p/2, where p is the order of the bn128 generator group)
    /// For example, one could issue a confidentialTransaction with 0 input notes, 10 output notes and kPublic = -10,000.
    /// If a satisfying zero-knowledge proof is provided, then we know with confidence that the values encrypted by the output notes sum to 10,000,
    /// but we have no idea how those tokens are distributed across the notes.
    /// Each output note has a value bounded by the AZTEC commitment scheme's range proof.
    function confidentialTransaction(bytes32[6][] notes, uint m, uint challenge, bytes32[3][] inputSignatures, address[] outputOwners) external {
        require(inputSignatures.length == m, "input signature length invalid");
        require(inputSignatures.length + outputOwners.length == notes.length, "array length mismatch");

        require(AZTECInterface(verifier).validateJoinSplit(notes, m, challenge, setupPubKey), "proof not valid!");
        uint kPublic = uint(notes[notes.length - 1][0]);

        if (kPublic > GROUP_MODULUS_BOUNDARY) {
            // if value > group modulus boundary, this represents a commitment of a public value into confidential note form.
            // only proceed if the required transferFrom call from msg.sender to this contract succeeds
            require(token.transferFrom(msg.sender, this, GROUP_MODULUS - kPublic), "token transfer from user failed!");
        }

        bytes32[3][] memory compressedInputNotes = new bytes32[3][](inputSignatures.length);
        bytes32[3][] memory compressedOutputNotes = new bytes32[3][](outputOwners.length);

        for (uint i = 0; i < m; i++) {
            // call validateInputNote to check that the note exists and that we have a matching signature over the note.
            // pass domainHash in as a function parameter to prevent multiple sloads
            // this will remove the input notes from noteRegistry
            compressedInputNotes[i] = validateInputNote(notes[i], inputSignatures[i], challenge, domainHash);
        }
        for (i = 0; i < notes.length - m; i++) {
            // validate that output notes, attached to the specified owners do not exist in noteRegistry.
            // if all checks pass, add notes into note registry
            compressedOutputNotes[i] = validateOutputNote(notes[i + m], outputOwners[i]);
        }
        if (kPublic < GROUP_MODULUS_BOUNDARY) {
            // if value < the group modulus boundary then this public value represents a conversion from confidential note form to public form
            // call token.transfer to send relevent tokens
            require(token.transfer(msg.sender, kPublic), "token transfer to user failed!");
        }
        // TODO. Figure out what to do here. Truffle is throwing decoder errors when I use bytes32 arrays...
        emit ConfidentialTransaction(abi.encode(compressedInputNotes), abi.encode(compressedOutputNotes), kPublic);
    }
}