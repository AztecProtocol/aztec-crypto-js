pragma solidity ^0.4.23;

import "./Storage.sol";

/**
 * @title PrimaryDeal Contract
 * @dev Parent contract for a CreditMint primary deal. Forwards method calls to Dispatcher.sol with storage address
 *
 */

 contract PrimaryDeal {

    /// @dev The constructor is not called when this contract is created via
    /// ContractFactory, as the constructor bytecode is not part of the contract.
    /// Set the deal master address to (-1) so that the template contract cannot be
    /// shenaniganned!
    constructor() public {
        _initialized = true;
    }

    Storage public _storage;
    address public TEST;
    address _dispatcher;
    bool public _initialized;
    function initialize(address storageAddress, address dealMaster) public {
        // _storage = Storage(storageAddress);
        // _storage.setUInt("core", "deal master", uint(dealMaster) /*a little type casting never hurt anyone, right?*/);
        _initialized = true;
        TEST = storageAddress;
        // TODO hard-code a dispatcher
    }

    function() external payable {
        assembly {
            if or(callvalue, iszero(sload(_initialized_slot))) {
                mstore(0x00, 400)
                revert(0x00, 0x20)
            }
            // add storage address to first 32 bytes of dispatcher calldata
            // append remainder of calldata to memory
            mstore(0x00, sload(_storage_slot))
            calldatacopy(0x20, 0x00, calldatasize)
            if iszero(delegatecall(not(0), sload(_dispatcher_slot), 0x00, add(calldatasize, 0x20), 0x00, 0x00)) {
                mstore(0x00, 400)
                revert(0x00, 0x20)
            }
            returndatacopy(0x00, 0x00, returndatasize)
            return(0x00, returndatasize)
        }
    }
 }