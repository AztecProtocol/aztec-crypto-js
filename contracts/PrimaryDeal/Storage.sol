pragma solidity ^0.4.23;

/**
 * @title Storage Contract
 * @dev a single source of state for PrimaryDeal. Provides a clean interface to manipulate state variables and enables
 * somewhat more functional patterns. Can upgrade PrimaryDeal library logic without modifying state
 *
 */

contract Storage {

    address public _owner;
    bool public _initialized;

    constructor(address owner) public {
        _owner = owner;
        _initialized = true;
    }

    function initialize(address owner) public {
        _owner = owner;
        _initialized = true;
    }
    function setUInt(bytes32 namespace, bytes32 variableName, uint value) external {
        require(msg.sender == _owner);
        assembly {
            let m := mload(0x40)
            mstore(m, calldataload(namespace))
            mstore(add(m, 0x20), calldataload(variableName))
            mstore(add(m, 0x40), "uint")
            sstore(keccak256(m, 0x60), calldataload(value))
        }
    }

    function getUInt(bytes32 namespace, bytes32 variableName) external view returns (uint /*value*/) {
        require(msg.sender == _owner);
        assembly {
            let m := mload(0x40)
            mstore(m, calldataload(namespace))
            mstore(add(m, 0x20), calldataload(variableName))
            mstore(add(m, 0x40), "uint")
            mstore(m, sload(keccak256(m, 0x60)))
            return(m, 0x20)
        }
    }

    function setUInts(bytes32 namespace, bytes32[] /* variableNames */, uint[] /* values */) public {
        require(msg.sender == _owner);
        assembly {
            let variableNames := calldataload(0x24) // calldata offset
            let values := calldataload(0x44) // calldata offset
            if iszero(eq(calldataload(variableNames), calldataload(values))) {
                // array length mismatch!
                mstore(0x00, 400)
                revert(0x00, 0x20)
            }
            let m := mload(0x40)
            let end := values
            let diff := sub(values, variableNames)
            mstore(m, calldataload(namespace))
            mstore(add(m, 0x40), "uint")
            for { let i := variableNames } lt(i, end) { i := add(i, 0x20) } {
                mstore(add(m, 0x20), calldataload(i))
                sstore(keccak256(m, 0x60), calldataload(add(i, diff)))
            }
        }
    }

    /// @dev the overhead of calling an external contract is quite high, at ~700 gas, relative to loading a storage
    /// variable, which is 200 gas. Ideally a method will read all of its required state variables at once through this interface
    function getUInts(bytes32 namespace, bytes32[] /* variableNames */) public view returns(uint[] /*values*/) {
        require(msg.sender == _owner);
        assembly {
            let variableNames := calldataload(0x24) // calldata offset
            let m := mload(0x40)
            let returnDataStart := add(m, 0x60)
            let r := returnDataStart
            mstore(m, calldataload(namespace))
            mstore(add(m, 0x40), "uint")
            for { let i := variableNames } lt(i, calldatasize) { i := add(i, 0x20) } {
                mstore(add(m, 0x20), calldataload(i))
                mstore(r, sload(keccak256(m, 0x60)))
                r := add(r, 0x20)
            }
            return(returnDataStart, sub(r, returnDataStart))
        }
    }
}