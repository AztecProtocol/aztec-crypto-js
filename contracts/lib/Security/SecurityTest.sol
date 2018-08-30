pragma solidity ^0.4.23;

/// @dev Normally functions that contain Structs as input parameters can only be called by
/// @dev Using the experimental abi encoder allows external transactions to also call these functions
pragma experimental ABIEncoderV2;


import "./Security.sol";

/// @title This is a dummy contract used for testing Security.sol.
/// @dev SecurityTest contains an instance of Security.sol as a dependency.
/// @dev SecurityTest also contains a registry of whitelisted addresses.
/// @dev We want to validate, that for any of SecurityTest's methods, the `message sender`.
/// @dev Has provided a valid ECDSA signature signed by a member of the whitelist.

/// @notice Traditionally, for simple contracts, it is sufficient to check that ```msg.sender``` is part
/// @notice of a whitelist. However, that prevents other addresses (such as smart contract addresses)
/// @notice acting as proxies for a member of the whitelist.

/// @notice To give an example, we want decentralized exchange smart contracts to be able to issue/trade
/// @notice ```notes``` on behalf of a member of our whitelist. ```msg.sender``` in this instance will be
/// @notice the exchange smart contract, *not* the whitelist member.
/// @notice By performing validation via ECDSA signatures, whitlist members can effectively nominate the
/// @notice decentralised exchange smart contract as a proxy, by signing an ECDSA signature whose message
/// @notice is the address of the proxied smart contract.

contract SecurityTest {
    /// @dev This is sort of like namespacing in C/C++
    /// @dev All of `Security's` methods are considered part of the `address` type
    /// @dev variables of `address` type are considered members of the `Security` class
    /// @dev e.g for `address blah`, we can call `blah::isWhitelisted`
    using Security for address;

    address owner;
    /// @dev the 'whitelist' is a map of ethereum addresses to booleans
    /// @dev Solidity mappings always default to 'false' if the value of a key has not been
    /// @dev explicitly set.
    /// @dev so unless an address in the mapping is explicitly set to true, whitelist[address] will return false
    /// @dev `whitelist` is a *storage* variable. Changes to it are permanent and therefore expensive in terms of gas
    mapping(address => bool) whitelist;

    struct ECDSASignature {
        uint r;
        uint s;
        uint8 v;
    }

    /// @dev as a simple test, let's only add one address to the whitelist; the address that created this smart contract
    constructor() {
        whitelist[msg.sender] = true;
    }

    /// @dev this is the function our test will call
    function validateWhitelist(ParentInterface parent, ECDSASignature memory signature) public view returns(bool) {
        address sender = address(msg.sender);
        return sender.isWhitelisted(signature);
    }
}
