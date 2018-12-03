pragma solidity ^0.4.23;


/// @title Smart contract to extract public keys from Ethereum addresses
/// @author CreditMint
/// @dev All rights reserved
contract Doorbell {

    mapping(address => uint) public addressBlockMap;

    function getBlock() external {
        uint number = block.number; 

        addressBlockMap[msg.sender] = number;        
    }
}

    


    

