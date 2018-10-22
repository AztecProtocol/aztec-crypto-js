pragma solidity ^0.4.23;

import "./Storage.sol";
import "../AZTEC/OptimizedAZTEC.sol";

contract TestPrimaryDeal {
    address _aztecValidator;
    // address _storage;
    bool _initialized = false;
    uint[4] _aztecKey;
    address _borrower;
    mapping(bytes32 => uint) noteRegistry;
    mapping(bytes32 => bytes32) documents;

    constructor(/*address storageAddress, */address aztecValidatorAddress, uint[4] aztecKey) public {
        _aztecValidator = aztecValidatorAddress;
       //  _storage = storageAddress;
        _aztecKey = aztecKey;
    }

    event Signed(address signer, bytes32 message);
    event StoredDocument(bytes32 documentHash);
    event InstantiatedNote(address owner, bytes32 noteHash);

    function validateBorrowerSignature(
        bytes32[4] borrowerSignature,
        bytes32[4][] fundSignatures,
        bytes32 transferCertificate,
        bytes32 seniorFacilitiesAgreement,
        bytes32 dealTerms,
        uint256 loanSize
    ) internal {
        bytes32 borrowerMessage = keccak256(abi.encode(
            fundSignatures,
            transferCertificate,
            seniorFacilitiesAgreement,
            dealTerms,
            loanSize
        ));
        address recoveredAddress = ecrecover(
                borrowerMessage,
                uint8(borrowerSignature[1]),
                bytes32(borrowerSignature[2]),
                bytes32(borrowerSignature[3])
            );
        require(recoveredAddress == address(borrowerSignature[0]), "borrower signature invalid ");
        emit Signed(recoveredAddress, borrowerMessage);
    }

    function validateSignatures(
        bytes32[4][] fundSignatures,
        bytes32[6][] fundNotes,
        bytes32 transferCertificate,
        bytes32 seniorFacilitiesAgreement,
        bytes32 dealTerms,
        uint256 loanSize
    ) internal returns (bytes32[]) {
        bytes32[] memory noteHashes = new bytes32[](fundSignatures.length);
        for (uint i = 0; i < fundSignatures.length; i++) {
            bytes32 r = keccak256(abi.encode(
                fundNotes[i][2],
                fundNotes[i][3],
                fundNotes[i][4],
                fundNotes[i][5],
                transferCertificate,
                seniorFacilitiesAgreement,
                dealTerms,
                loanSize
            ));
            address recoveredAddress = ecrecover(
                r,
                uint8(fundSignatures[i][1]),
                bytes32(fundSignatures[i][2]),
                bytes32(fundSignatures[i][3])
            );
            noteHashes[i] = keccak256(abi.encode(
                fundNotes[i][2],
                fundNotes[i][3],
                fundNotes[i][4],
                fundNotes[i][5]
            ));
            require(recoveredAddress == address(fundSignatures[i][0]), "fund signature invalid!");
            emit Signed(recoveredAddress, r);
        }
        return noteHashes;
    }

    function syndicate(
        bytes32[4] borrowerSignature,
        bytes32[4][] fundSignatures,
        bytes32 transferCertificate,
        bytes32 seniorFacilitiesAgreement,
        bytes32 dealTerms, // TODO ADD PROPER TERMS
        bytes32[6][] fundNotes,
        uint challenge,
        uint loanSize
    ) public {
        require(_initialized == false);
        require(fundSignatures.length == fundNotes.length, "note count and fund count do not match");
        validateBorrowerSignature(
            borrowerSignature,
            fundSignatures,
            transferCertificate,
            seniorFacilitiesAgreement,
            dealTerms,
            loanSize
        );

        bytes32[] memory noteHashes = validateSignatures(
            fundSignatures,
            fundNotes,
            transferCertificate,
            seniorFacilitiesAgreement,
            dealTerms,
            loanSize
        );

        if (OptimizedAZTECInterface(_aztecValidator).validateCommit(fundNotes, challenge, loanSize, _aztecKey)) {
            _initialized = true;
            for (uint j = 0; j < noteHashes.length; j++) {
                address owner = address(fundSignatures[j][0]);
                uint noteFlags = uint(owner) | 0x8000000000000000000000000000000000000000000000000000000000000000;
                noteRegistry[noteHashes[j]] = noteFlags;
                emit InstantiatedNote(owner, noteHashes[j]);
            }
            documents["transferCerficiate"] = transferCertificate;
            documents["seniorFacilitiesAgreement"] = seniorFacilitiesAgreement;
            // Storage(_storage).setUInt("documents", "transferCertificate", uint(transferCertificate));
            // Storage(_storage).setUInt("documents", "seniorFacilitiesAgreement", uint(seniorFacilitiesAgreement));
            emit StoredDocument(transferCertificate);
            emit StoredDocument(seniorFacilitiesAgreement);

        } else {
            revert("proof invalid");
        }
    }

}