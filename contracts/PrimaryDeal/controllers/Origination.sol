pragma solidity ^0.4.23;

import "../Storage.sol";

/**
 * @title Origination
 * @dev Library to manage deal origination flows
 *
 */

library OriginationService {
    function getBasicInfo(Storage store) internal view returns (address dealMaster, bytes32 dealPhase) {
        bytes32[] memory vars = new bytes32[](2);
        vars[0] = "dealMaster";
        vars[1] = "dealPhase";
        uint[] memory data = store.getUInts("core", vars);
        dealMaster = address(data[0]);
        dealPhase = bytes32(data[1]);
    }

    function setArranger(Storage store, address arranger) internal {
        bytes32 key = keccak256(abi.encode("arrangers", arranger));
        store.setUInt("core", key, 1);
    }
}

library Origination {

    using OriginationService for Storage;

    function addArranger(Storage store, address arranger) public {
        address dealMaster;
        bytes32 dealPhase;
        (dealMaster, dealPhase) = store.getBasicInfo();

        require(dealMaster == msg.sender);
        require(dealPhase == "Origination");

        store.setArranger(arranger);
    }
}