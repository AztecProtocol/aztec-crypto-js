pragma solidity ^0.4.23;
pragma experimental ABIEncoderV2;

contract Exchange {
    struct ECDSASignature {
        bytes32 r;
        bytes32 s;
        uint8 v;
    }
    struct Order {
        address maker; // address of order creator
        address taker; // address or order filler
        address makerToken; // smart contract address of maker asset
        address takerToken;
        uint makerTokenAmount;
        uint takerTokenRequested;
        uint takerTokenSupplied; // the taker might not completely fill the maker's order
        ECDSASignature makerSignature;
        ECDSASignature takerSignature;
        bool fillingPartial; // is this order filling an order that has already been partially filled?
        bytes32 orderHash; // a hash of all the order parameters
    }
    
    mapping(address => bool) partialFills;
    mapping(address => bool) tokenRegistry;
    mapping(bytes32 => bool) cancelledOrders;
    address owner;

    constructor() public {
        owner = msg.sender; // We will want to upgrade this to use a more distributed governance mechanic, but this will work fine for now
    }

    function addToken(address tokenAddress) public {
        tokenRegistry[tokenAddress] = true;
    }

    function removeToken(address tokenAddress) public {
        tokenRegistry[tokenAddress] = false;
    }

    function fillOrders(Order[] orders) public returns (bool) {

    }
}