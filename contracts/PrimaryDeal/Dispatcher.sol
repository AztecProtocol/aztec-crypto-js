pragma solidity ^0.4.23;

/**
 * @title Dispatcher Contract
 * @dev acts as a router, sending the transaction payload to one of the PrimaryDeal's libraries
 *
 */

 contract Dispatcher {
     // Todo optimize
     constructor(address[] libraries, bytes32[] librarySignatures) public {
         require(libraries.length == librarySignatures.length);
         for (uint i = 0; i < libraries.length; i++) {
             bytes32 sig = librarySignatures[i];
             address addr = libraries[i];
             assembly {
                 sstore(sig, addr)
             }
         }
     }

     /// @dev declared payable to remove Solidity compiler boilerplate
     function() external payable {
        assembly {
            if callvalue {
                mstore(0x00, 400)
                revert(0x00, 0x20)
            }
            // Our custom ABI is distinguished by having the first 4 bytes of calldata (after storage address) be 0
            // instead of a function signature
            let functionSelector := div(calldataload(0x20), 0x100000000000000000000000000000000000000000000000000000000)
            switch functionSelector
                case 0 {
                    dispatch()
                }
                default {
                    dispatchPublicAPI()
                }

            /// @dev calldata map:
            /// 0x00 - 0x20 : storage address
            /// 0x20 - 0x24 : upgraded ABI function signature precursor (0x00000000)
            /// 0x24 - 0x28 : upgraded ABI library signature
            /// 0x28 - 0x2c : function signature of library function
            /// 0x2c - ???? : remainder of calldata
            function dispatch() {
                let route := div(calldataload(0x24), 0x100000000000000000000000000000000000000000000000000000000)
                mstore(0x00, route)
                mstore(0x20, "routes")
                let controller := sload(keccak256(0x00, 0x40))
                if iszero(controller) {
                    mstore(0x00, 404)
                    revert(0x00, 0x20)
                }
                // create sane memory map for recipient library
                // put function signature in first 4 bytes
                mstore(0x00, calldataload(0x28))
                // and put storage address after function signature (input parameter)
                mstore(0x04, calldataload(0x00))
                // copy remainder of calldata and place at 0x24, immediately after input parameter
                calldatacopy(0x24, 0x2c, sub(calldatasize, 0x2c))
                if iszero(delegatecall(not(0), controller, 0x00, sub(calldatasize, 0x08), 0x00, 0x00)) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }
                returndatacopy(0x00, 0x00, returndatasize)
                return(0x00, returndatasize)
            }

            function dispatchPublicAPI() {
                mstore(0x00, "public")  // todo, something a bit clearer than this
                mstore(0x20, "routes")
                let publicAPI := sload(keccak256(0x00, 0x40))
                mstore(0x00, calldataload(0x20))
                mstore(0x04, calldataload(0x00))
                calldatacopy(0x24, 0x24, sub(calldatasize, 0x24))
                if iszero(delegatecall(not(0), publicAPI, 0x00, calldatasize, 0x00, 0x00)) {
                    mstore(0x00, 400)
                    revert(0x00, 0x20)
                }
                returndatacopy(0x00, 0x00, returndatasize)
                return(0x00, returndatasize)
            }
        }
     }
 }