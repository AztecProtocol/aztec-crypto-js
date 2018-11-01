pragma solidity ^0.4.23;

import "./Storage.sol";
import "../AZTEC/AZTEC.sol";

contract TestPrimaryDeal {
    address _aztecValidator;
    // address _storage;
    bool _initialized = false;
    bytes32[4] _aztecKey;
    address _borrower;
    mapping(bytes32 => uint) noteRegistry;
    mapping(bytes32 => bytes32) documents;

    constructor(/*address storageAddress, */address aztecValidatorAddress, bytes32[4] aztecKey) public {
        _aztecValidator = aztecValidatorAddress;
       //  _storage = storageAddress;
        _aztecKey = aztecKey;
    }

    event Signed(address signer, bytes32 message);
    event StoredDocument(bytes32 documentHash);
    event InstantiatedNote(address owner, bytes32 noteHash);

    function validateBorrowerSignature(
        bytes32[3] borrowerSignature,
        bytes32[3][] fundSignatures,
        bytes32 executionDocument,
        uint256 loanSize
    ) internal {
        bytes32 borrowerMessage = keccak256(abi.encode(
            fundSignatures,
            executionDocument,
            loanSize
        ));
        address borrowerAddress = ecrecover(
                borrowerMessage,
                uint8(borrowerSignature[0]),
                bytes32(borrowerSignature[1]),
                bytes32(borrowerSignature[2])
            );
        emit Signed(borrowerAddress, borrowerMessage);
    }

    event Debug(bytes32 v, bytes32 r, bytes32 s);
    event Debug2(address x);
    function validateSignatures(
        bytes32[3][] fundSignatures,
        bytes32[6][] fundNotes,
        uint256 loanSize
    ) internal returns (bytes32[2][]) {
        bytes32[2][] memory noteHashes = new bytes32[2][](fundSignatures.length);
        for (uint i = 0; i < fundSignatures.length; i++) {
            bytes32 r = keccak256(abi.encode(
                fundNotes[i][2],
                fundNotes[i][3],
                fundNotes[i][4],
                fundNotes[i][5],
                loanSize
            ));
            address fundAddress = ecrecover(
                r,
                uint8(fundSignatures[i][0]),
                bytes32(fundSignatures[i][1]),
                bytes32(fundSignatures[i][2])
            );

            noteHashes[i][0] = keccak256(abi.encode(
                fundNotes[i][2],
                fundNotes[i][3],
                fundNotes[i][4],
                fundNotes[i][5]
            ));
            noteHashes[i][1] = bytes32(fundAddress);
            emit Signed(fundAddress, r);
        }
        return noteHashes;
    }

    function syndicate(
        bytes32[3] borrowerSignature,
        bytes32[3][] fundSignatures,
        bytes32 executionDocument,
        bytes32[6][] fundNotes,
        uint challenge,
        uint loanSize
    ) public {
        require(_initialized == false);
        require(fundSignatures.length == fundNotes.length, "note count and fund count do not match");
        validateBorrowerSignature(
            borrowerSignature,
            fundSignatures,
            executionDocument,
            loanSize
        );

        bytes32[2][] memory noteInfo = validateSignatures(
            fundSignatures,
            fundNotes,
            loanSize
        );
        // TODO, fix
        if (AZTECInterface(_aztecValidator).validateJoinSplit(fundNotes, fundNotes.length, challenge, _aztecKey)) {
            _initialized = true;
            for (uint j = 0; j < noteInfo.length; j++) {
                address owner = address(fundSignatures[j][0]);
                uint noteFlags = uint(owner) | 0x8000000000000000000000000000000000000000000000000000000000000000;
                noteRegistry[noteInfo[j][0]] = noteFlags;
                emit InstantiatedNote(address(noteInfo[j][1]), noteInfo[j][0]);
            }
            documents["executionDocument"] = executionDocument;
            // Storage(_storage).setUInt("documents", "transferCertificate", uint(transferCertificate));
            // Storage(_storage).setUInt("documents", "seniorFacilitiesAgreement", uint(seniorFacilitiesAgreement));
            emit StoredDocument(executionDocument);

        } else {
            revert("proof invalid");
        }
    }

}