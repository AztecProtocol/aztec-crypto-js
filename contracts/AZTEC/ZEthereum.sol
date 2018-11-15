pragma solidity ^0.4.23;

import "./AZTEC.sol";
import "../ERC20/ERC20Mintable.sol";
import "../ERC20/SafeMath.sol";


// [["0x01","0x02","0x03","0x04","0x05","0x06"]], [["0x0a", "0x0b", "0x0c"]], 123, 456
/// @title Contract that uses the AZTEC protocol to create Zero-knowledge Ethereum, a confidential representation of Ethereum!
/// @author Zachary Williamson, CreditMint
/// @dev All rights reserved. This is a technical demo! Use at your own risk!
contract ZEthereum {
    using SafeMath for uint;

    uint constant GROUP_MODULUS_BOUNDARY = 10944121435919637611123202872628637544274182200208017171849102093287904247808;
    uint constant GROUP_MODULUS = 21888242871839275222246405745257275088548364400416034343698204186575808495617;
    uint constant ZETHEREUM_SCALING_PARAMETER = 10000000000000000; // A confidential note of value 1 is equal to 10^16 wei, or 0.01 ethereum.
    mapping(bytes32 => address) public noteRegistry;
    bytes32[4] setupPubKey;
    bytes32 domainHash;
    uint globalSupply = 0;
    event Created(bytes32 domainHash, address contractAddress);
    event ConfidentialTransaction(uint value, bytes metadata);
    event Debug(uint val);
    event DebugBytes32(bytes32 val);
    event DebugNotes(bytes notes);

    struct Proof {
        bytes32[6][] notes;
        bytes32[3][] inputSignatures;
        uint m;
        uint challenge;
    }
    /// @dev Set the trusted setup public key, the address of the AZTEC verification smart contract and the ERC20 token we're linking to
    constructor(bytes32[4] _setupPubKey) public {
        setupPubKey = _setupPubKey;

        // calculate the EIP712 domain hash, for hashing structured data
        bytes32 _domainHash;
        assembly {
            let m := mload(0x40)
            mstore(m, 0x8d4b25bfecb769291b71726cd5ec8a497664cc7292c02b1868a0534306741fd9)
            mstore(add(m, 0x20), 0x87a23625953c9fb02b3570c86f75403039bbe5de82b48ca671c10157d91a991a) // name = "AZTEC_MAINNET_DOMAIN"
            mstore(add(m, 0x40), 0x25130290f410620ec94e7cf11f1cdab5dea284e1039a83fa7b87f727031ff5f4) // version = "0.1.0"
            mstore(add(m, 0x60), 1) // chain id
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
    function validateInputNote(bytes32[6] note, bytes32[3] signature, uint challenge, bytes32 domainHashTemp) internal {
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
    }

    function validateOutputNote(bytes32[6] note, address owner) internal {
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
    }

    function extractDataFromProof(bytes proof) internal returns (Proof){
        bytes32 offsetToProofData;
        bytes32 proofBytes;
        bytes32 offsetToNotes;
        bytes32 bytesNotes;
        uint lengthOfNotes;
        bytes32 bytesInputSignatures;
        bytes32 offsetToInputSignatures;
        uint lengthOfInputSignatures;

        uint m;
        uint challenge;

        assembly {
            offsetToProofData := calldataload(0x04)
            proofBytes := add(offsetToProofData, 0x24)

            offsetToNotes := calldataload(proofBytes)
            m := calldataload(add(proofBytes, 0x20))
            challenge := calldataload(add(proofBytes, 0x40))
            offsetToInputSignatures := calldataload(add(proofBytes, 0x60))
            
            bytesNotes := add(offsetToNotes, proofBytes)
            lengthOfNotes := calldataload(bytesNotes)

            bytesInputSignatures := add(offsetToInputSignatures, proofBytes)
            lengthOfInputSignatures := calldataload(bytesInputSignatures)
        }

        Proof memory proofData = Proof(new bytes32[6][](lengthOfNotes), new bytes32[3][](lengthOfInputSignatures), m, challenge);

        assembly {
            // the first mload will get you from the head of the struct to the reference to the length
            // the reference to the data is 32 bytes after that
            // mloading that gets you to the start of the actual data in memory
            let notesDataOffset := mload(add(mload(proofData), 0x20))
            let inputSignaturesDataOffset := mload(add(mload(add(proofData, 0x20)), 0x20))

            calldatacopy(notesDataOffset, add(0x20, bytesNotes), mul(0xc0, lengthOfNotes))
            calldatacopy(inputSignaturesDataOffset, add(0x20, bytesInputSignatures), add(0x20, mul(0x60, lengthOfInputSignatures)))
        }

        return proofData;
    }

    /// @dev validate a confidential transaction. This transaction takes 'm' input notes and 'n - m' output notes (where n = notes.length), along with a public
    /// commitment of ethereum 'kPublic' (located at notes[notes.length][0]). ```notes```, ```m``` and ```challenge``` constitute an AZTEC zero-knowledge
    /// proof that is checked by the AZTEC validator smart contract.
    /// If the proof is valid, then the sum of the values of the input notes is equal to the sum of the values of the output notes, plus kPublic.
    /// \sum_{i=0}^{m-1}k_i = \sum_{i=m}^{n-1}k_i + k_{public} (mod p)
    /// Non-zero values of ```kPublic``` represent ethereum being converted to/from AZTEC note form.
    /// Positive values of ```kPublic``` imply a conversion from ethereum to AZTEC form, negative values imply a conversion from AZTEC notes to public ERC20 tokens
    /// (care should be taken that 'negative' here means integers greater than p/2, where p is the order of the bn128 generator group)
    /// For example, one could issue a confidentialTransaction with 0 input notes, 10 output notes and kPublic = -10,000.
    /// If a satisfying zero-knowledge proof is provided, then we know with confidence that the values encrypted by the output notes sum to 10,000,
    /// but we have no idea how those tokens are distributed across the notes.
    /// Each output note has a value bounded by the AZTEC commitment scheme's range proof.
    function confidentialTransaction(bytes proof, address[] outputOwners, bytes metadata) external payable {
        Proof memory proofData = extractDataFromProof(proof);
        
        require(proofData.inputSignatures.length == proofData.m, "input signature length invalid");
        require(proofData.inputSignatures.length + outputOwners.length == proofData.notes.length, "array length mismatch");
        uint kPublic = uint(proofData.notes[proofData.notes.length - 1][0]);

        require(AZTECInterface.validateJoinSplit(proofData.notes, proofData.m, proofData.challenge, setupPubKey), "proof not valid!");

        if (kPublic > GROUP_MODULUS_BOUNDARY) {
            // if value > group modulus boundary, this represents a commitment of a public value into confidential note form.
            // only proceed if the transaction sender has sent enough ether.
            // The AZTEC range proof constrains the size of the values that can be represented in confidential note form.
            // The technical demo taps out at 1048575, a full implementation could reach a cap of about 2^32
            // so we apply a scaling paramter when translating to/from confidential form
            require(msg.value == ((GROUP_MODULUS - kPublic) * ZETHEREUM_SCALING_PARAMETER), "msg.value is not sufficient for this transaction!");
            globalSupply = globalSupply.add((GROUP_MODULUS - kPublic) * ZETHEREUM_SCALING_PARAMETER);
        }

        for (uint i = 0; i < proofData.m; i++) {
            // call validateInputNote to check that the note exists and that we have a matching signature over the note.
            // pass domainHash in as a function parameter to prevent multiple sloads
            // this will remove the input notes from noteRegistry
            validateInputNote(proofData.notes[i], proofData.inputSignatures[i], proofData.challenge, domainHash);
        }
        for (i = 0; i < proofData.notes.length - proofData.m; i++) {
            // validate that output notes, attached to the specified owners do not exist in noteRegistry.
            // if all checks pass, add notes into note registry
            validateOutputNote(proofData.notes[i + proofData.m], outputOwners[i]);
        }
        if (kPublic < GROUP_MODULUS_BOUNDARY) {
            // if value < the group modulus boundary then this public value represents a conversion from confidential note form to public form
            // call token.transfer to send relevent tokens.
            // globalSupply should never be less than kPublic * ZETHEREUM_SCALING_PARAMETER,
            // if that happens then somebody has either solved the discrete logarithm problem for the bn128 curve, or the trusted setup trapdoor key was not destroyed!
            globalSupply = globalSupply.sub(kPublic * ZETHEREUM_SCALING_PARAMETER);
            msg.sender.transfer(kPublic * ZETHEREUM_SCALING_PARAMETER);
        }
        // TODO. Figure out what to do here. Truffle is throwing decoder errors when I use bytes32 arrays...
        emit ConfidentialTransaction(kPublic, metadata);
    }
}