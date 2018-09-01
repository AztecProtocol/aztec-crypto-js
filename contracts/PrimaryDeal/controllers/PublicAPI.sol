pragma solidity ^0.4.23;

/**
 * @title PublicAPI Library
 * @dev endpoint that interfaces with transactions that do not use the upgraded ABI
 * @notice smart contracts calling PrimaryDeal should end up here, however it is entirely possible for a smart contract
 * to interface with PrimaryDeal through the upgraded ABI. This library is for convenience and not security (can change later if we need to)
 *
 */

 library PublicAPI {
     // TODO: this endpoint will enable exchange contracts to move AZTEC notes, fill in when we've impelemented the exchange
     function transfer(address, address, uint, uint) public returns (bool) {
         return true;
     }
 }