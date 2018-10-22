pragma solidity ^0.4.23;

contract SignatureTest {

    function testSignature(bytes32 message, uint[4] input) public returns (bool) {
        address recovered = ecrecover(message, uint8(input[1]), bytes32(input[2]), bytes32(input[3]));
        return (recovered == address(input[0]));
    }
}
