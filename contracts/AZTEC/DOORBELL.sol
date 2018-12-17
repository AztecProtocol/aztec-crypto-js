pragma solidity ^0.4.23;


/// @title Smart contract record the blockNumber alongside a user Ethereum address
/// @author AZTEC
/// @dev This is a smart contract whose purpose is to create a public mapping between a user's Ethereum address and 
/// the number of the block in which a transaction they sent is stored
contract Doorbell {

    mapping(address => uint) public addressBlockMap;

    function setBlock() external {
        /// @title Set the blockNumber in the public mapping between address and blockNumber
        /// @author AZTEC
        uint number = block.number; 
        addressBlockMap[msg.sender] = number;        
    }
}
