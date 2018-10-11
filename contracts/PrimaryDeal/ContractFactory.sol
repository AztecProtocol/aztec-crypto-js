pragma solidity ^0.4.23;

/**
 * @title Contract Factory
 * @dev Generator contract for PrimaryDeal contracts.
 *
 */

contract StorageInterface {
    function initialize(address owner) public;
}

contract PrimaryDealInterface {
    function initialize(address storageAddress, address dealMaster) public;
}

contract ContractFactory {

    address public _owner;
    address _storageTemplate;
    address _primaryDealTemplate;
    uint32 _storageVersion;
    uint32 _primaryDealVersion;

    mapping(address => uint) foo;

    function changeFoo(address bar) {
        foo[bar]++;
    }

    function changeFooAssembly(address) {
        assembly {
            0x04 calldataload 0x00 mstore
            foo_slot 0x20 mstore
            0x40 0x00 keccak256
            0x01 dup2 sload add
            sstore
        }
    }

    function() {
        /*


        */
    }
    // TODO pretty sure the dispatcher can be managed from the primary deal, don't need the factory to specify it
    event CreatedPrimaryDeal(address primaryDeal);
    event UpdatedPrimaryDeal(address newTemplate, uint newVersion);
    event UpdatedStorage(address newTemplate, uint newVersion);

    constructor(address storageTemplate, address primaryDealTemplate) public {
        _owner = msg.sender;
        _storageTemplate = storageTemplate;
        _primaryDealTemplate = primaryDealTemplate;
        _storageVersion = 1;
        _primaryDealVersion = 1;
        emit UpdatedPrimaryDeal(primaryDealTemplate, 1);
        emit UpdatedStorage(storageTemplate, 1);
    }

    function updatePrimaryDealTemplate(address newPrimaryDealTemplate) public {
        require(_owner == msg.sender);
        _storageTemplate = newPrimaryDealTemplate;
        uint32 newVersion = _primaryDealVersion + 1;
        _primaryDealVersion = newVersion;
        emit UpdatedPrimaryDeal(newPrimaryDealTemplate, newVersion);
    }

    function updateStorageTemplate(address newStorageTemplate) public {
        require(_owner == msg.sender);
        _storageTemplate = newStorageTemplate;
        uint32 newVersion = _storageVersion + 1;
        _storageVersion = newVersion;
        emit UpdatedStorage(newStorageTemplate, newVersion);
    }

    function getStorageSize() public view returns (uint r) {
        assembly {
            r := extcodesize(sload(_primaryDealTemplate_slot))
        }
    }
    function createPrimaryDeal(address dealMaster) public {
        require(_owner == msg.sender);
        address storageAddress;
        address primaryDealAddress;
        assembly {
            let contractTemplate := sload(_storageTemplate_slot)
            // TODO, add proper constructors
            mstore(0x00, or (0x5880730000000000000000000000000000000000000000803b80938091923cF3 ,mul(contractTemplate, 0x1000000000000000000)))

            // let size := extcodesize(contractTemplate)
            // extcodecopy(contractTemplate, 0x00, 0x00, size)
            storageAddress := create(0x00, 0x00, 0x20)
            if iszero(storageAddress) {
                revert(0x00, 0x00)
            }
            contractTemplate := sload(_primaryDealTemplate_slot)
            mstore(0x00, or (0x5880730000000000000000000000000000000000000000803b80938091923cF3 ,mul(contractTemplate, 0x1000000000000000000)))
            // size := extcodesize(contractTemplate)
            // extcodecopy(contractTemplate, 0x00, 0x00, size)
            primaryDealAddress := create(0x00, 0x00, 0x20)
            if iszero(primaryDealAddress) {
                revert(0x00, 0x00)
            }
        }

        StorageInterface(storageAddress).initialize(primaryDealAddress);
        PrimaryDealInterface(primaryDealAddress).initialize(storageAddress, dealMaster);
        emit CreatedPrimaryDeal(primaryDealAddress);
    }
}