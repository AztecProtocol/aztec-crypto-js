pragma solidity ^0.4.23;

import "./ECDSA.sol";
import "./OptimizedAztec.sol";

contract AZTECTokenBase {

    mapping(bytes32 => bool) noteRegistry;
    bytes32[4] setupPubKey;
    address verifier;

    constructor(bytes32[4] _setupPubKey, address _verifier) public {
        setupPubKey = _setupPubKey;
        verifier = _verifier;
    }

    function getNoteHash(bytes32 gammaX, bytes32 gammaY, bytes32 sigmaX, bytes32 sigmaY, address owner) internal pure returns (bytes32 r) {
        assembly {
            let m := mload(0x40)
            mstore(m, gammaX)
            mstore(add(m, 0x20), gammaY)
            mstore(add(m, 0x40), sigmaX)
            mstore(add(m, 0x60), sigmaY)
            mstore(add(m, 0x80), owner)
            r := keccak256(m, 0xa0)
        }
    }

    function hashInputNotes(uint[3][] inputSignatures, bytes32[6][] inputNotes, uint challenge) view internal returns (bytes32[] memory) {
        bytes32[] memory inputNoteHashes = new bytes32[](inputNotes.length);
        for (uint i = 0; i < inputNotes.length; i++) {
                address owner = ECDSA.recover(bytes32(inputSignatures[i][0]), uint8(inputSignatures[i][1]), bytes32(inputSignatures[i][2]), bytes32(challenge));
                bytes32 noteHash = getNoteHash(inputNotes[i][2], inputNotes[i][3], inputNotes[i][4], inputNotes[i][5], owner);
                require(noteRegistry[noteHash] == true);
                inputNoteHashes[i] = noteHash;
        }
        return inputNoteHashes;
    }

    function hashOutputNotes(address[] outputNoteOwners, bytes32[6][] outputNotes) view internal returns (bytes32[] memory) {
        bytes32[] memory outputNoteHashes = new bytes32[](outputNotes.length);
        for (uint i = 0; i < outputNotes.length; i++) {
                bytes32 outputNoteHash = getNoteHash(outputNotes[i][2], outputNotes[i][3], outputNotes[i][4], outputNotes[i][5], outputNoteOwners[i]);
                require(noteRegistry[outputNoteHash] == false);
                outputNoteHashes[i] = outputNoteHash;
        }
        return outputNoteHashes;
    }

    function joinSplitTransaction(uint[3][] inputSignatures, address[] outputNoteOwners, bytes32[6][] inputNotes, bytes32[6][] outputNotes, uint challenge) external {
        require(inputSignatures.length == inputNotes.length);
        bytes32[] memory inputNoteHashes = hashInputNotes(inputSignatures, inputNotes, challenge);
        bytes32[] memory outputNoteHashes = hashOutputNotes(outputNoteOwners, outputNotes);
    
        OptimizedAZTECInterface optimizedAZTEC = OptimizedAZTECInterface(verifier);
        if (optimizedAZTEC.validateJoinSplit(inputNotes, outputNotes, challenge, setupPubKey)) {
            for (uint i = 0; i < inputNoteHashes.length; i++) {
                noteRegistry[inputNoteHashes[i]] = false;
            }
            for (uint j = 0; j < outputNoteHashes.length; j++) {
                noteRegistry[outputNoteHashes[j]] = true;
            }
        }
    }
}