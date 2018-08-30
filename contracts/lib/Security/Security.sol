pragma solidity ^0.4.23;
pragma experimental ABIEncoderV2;

/// @title Library to validate that entities interfacing with our smart contracts are authorized
/// @dev Security.sol is called from other smart contracts, and is used to validate that an entity calling
/// @dev functions on the other smart contract is authorized to do so, by checking an ECDSA signature.

contract ParentInterface {
    function hasWhitelistToken(address) public view returns(bool) {}
}

contract Security {

    address owner;

    struct ECDSASignature {
        uint r;
        uint s;
        uint8 v;
    }
    // 'ecdsarecover' can be used, alongside valid signatures,
    // to validate that the 'order' was consented to by buyer and seller
    // https://ethereum.stackexchange.com/questions/710/how-can-i-verify-a-cryptographic-signature-that-was-produced-by-an-ethereum-addr
    /// @param parent : the smart contract that is using SecurityLibrary
    /// @param signature: the ECDSA signature components
    /// @return a boolean depending on if signer of signature is part of whitelist
    function isWhitelisted(ParentInterface parent, ECDSASignature memory signature) {
        // The 'message' of the signature needs to be the address of the whoever called the parent contract
        bytes32 message = keccak256(msg.sender);
    }
}
