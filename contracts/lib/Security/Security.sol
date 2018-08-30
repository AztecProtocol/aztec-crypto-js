pragma solidity ^0.4.23;

/// @title Library to validate that entities interfacing with our smart contracts are authorized
/// @dev Security.sol is called from other smart contracts, and is used to validate that an entity calling
/// @dev functions on the other smart contract is authorized to do so, by checking an ECDSA signature.

contract ParentInterface {
    function whitelist(address) public view returns(bool) {}
}

/// @dev libraries are functionally similar to contracts, with some key differences
/// libraries cannot have their own storage variables (they have no persistant state)
/// They are designed to have their methods called by other contracts or libraries
/// There are two fundamental ways smart contracts can interface with a library
/// The first is by referencing a 'library' smart contract instantiated at a specific address.
/// The second is to incorporate a library's bytecode directly into a smart contract (done by the compiler)
/// The former is useful for complex methods \ as it means multiple smart contracts can reference a single
/// library and reduce the amount of raw bytecode that needs to be  deployed on-chain
/// The latter is useful for small helper functions, where the gas cost of calling an external smart contract
/// would be excessive. This is done by declaring a library function to be `internal`. This notifies the  
/// Solidity compiler to incorporate the function's bytecode in any contract that uses the library.
/// @notice It costs 700 gas to call an external library instantiated at a specific smart contract address.
/// When creating a smart contract, it costs 200 gas per byte of bytecode the contract contains.
/// Whether a library's methods should be internal or not depends on which of the above two
/// is worth minimizing for a given method.
library Security {

    /// @dev we defnie the ECDSASignature struct, which contains the variables used to validate an
    /// @dev ECDSA signature. See https://en.wikipedia.org/wiki/Elliptic_Curve_Digital_Signature_Algorithm
    struct ECDSASignature {
        uint r;
        uint s;
        uint8 v;
    }

    // 'ecdsarecover' can be used, alongside valid signatures,
    // to validate that the 'order' was consented to by buyer and seller
    // https://ethereum.stackexchange.com/questions/710/how-can-i-verify-a-cryptographic-signature-that-was-produced-by-an-ethereum-addr
    /// @param parent : the smart contract that is using SecurityLibrary
    /// @return a boolean depending on if signer of signature is part of whitelist
    /// @dev The 'message' of the signature needs to be the address of the whoever called the parent contract
    /// cast `parent` to a ParentInterface contract type, so that we can call the
    /// `isWhitelisted` method. If this method does not exist the function should throw
    function isWhitelisted(address parent, ECDSASignature memory signature) internal view returns(bool) {
        ParentInterface _parent = ParentInterface(parent);
        bytes32 message = keccak256(abi.encodePacked(msg.sender));
        address signer;
        return _parent.whitelist(signer);
        // TODO: get ethereum address that signed ECDSASignature signature,
        // then call _parent.isWhitelisted with the signing address as the input parameter
    }
}
