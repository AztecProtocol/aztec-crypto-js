pragma solidity ^0.4.23;

library ECDSA {

    function recover(bytes32 message, uint8 v, bytes32 r, bytes32 s) internal pure returns (address) {
        address signingAddr = ecrecover(message, v, r, s);
        return signingAddr;
    }
}