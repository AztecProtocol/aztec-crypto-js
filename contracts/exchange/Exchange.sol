pragma solidity ^0.4.23;
pragma experimental ABIEncoderV2;

import "../contractHelpers/SafeMath.sol";
import "../lib/Security/SecurityTest.sol";
import "../lib/Security/Security.sol";
import "../tokens/UsefulCoin.sol";

contract Exchange {
    using SafeMath for uint256;
    using Security for Security.ECDSASignature;

    UsefulCoin public tokenFunctions;

    struct ECDSASignature {
        bytes32 r;
        bytes32 s;
        uint8 v;
    }
    struct Order {
        address maker; // address of order creator
        address taker; // address of order filler
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
    
    mapping(bytes32 => bool) partialFills;
    mapping(address => bool) tokenRegistry;
    mapping(bytes32 => bool) cancelledOrders;
    address owner;

    constructor() public {
        owner = msg.sender; // We will want to upgrade this to use a more distributed governance mechanic, but this will work fine for now
    }

    // function makeOrder(
    //     address maker, // address of order creator
    //     address taker, // address of order filler
    //     address makerToken, // smart contract address of maker asset
    //     address takerToken,
    //     uint makerTokenAmount,
    //     uint takerTokenRequested,
    //     uint takerTokenSupplied, // the taker might not completely fill the maker's order
    //     ECDSASignature makerSignature,
    //     ECDSASignature takerSignature,
    //     bool fillingPartial, // is this order filling an order that has already been partially filled?
    //     bytes32 orderHash // a hash of all the order parameters
    // ) public view returns (Order) {
    //     Order order = {maker,taker,makerToken,takerToken,makerTokenAmount,takerTokenRequested,takerTokenSupplied,makerSignature,takerSignature, fillingPartial, orderHash};
    //     return order;
    // }

    function addToken(address tokenAddress) public {
        tokenRegistry[tokenAddress] = true;
    }

    function removeToken(address tokenAddress) public {
        tokenRegistry[tokenAddress] = false;
    }

    function _newOrder(Order order) public returns (bool) {
        address makerToken = order.makerToken;
        address takerToken = order.takerToken;
        if (order.takerTokenSupplied < order.takerTokenRequested) {
            partialFills[order.orderHash] = true;
            takerToken.call(
                bytes4(keccak256("delegatedTransfer(address, address, uint256, uint256, bytes32, bytes32, uint8 v)")),
                order.taker,
                order.maker,
                order.takerTokenSupplied,
                order.takerTokenRequested,
                order.takerSignature.r,
                order.takerSignature.s,
                order.takerSignature.v
            );
        } else {
            takerToken.call(
                bytes4(keccak256("delegatedTransfer(address, address, uint256, uint256, bytes32, bytes32, uint8 v)")),
                order.taker,
                order.maker,
                order.takerTokenRequested,
                order.takerTokenRequested,
                order.takerSignature.r,
                order.takerSignature.s,
                order.takerSignature.v);
            makerToken.call(
                bytes4(keccak256("delegatedTransfer(address, address, uint256, uint256, bytes32, bytes32, uint8 v)")),
                order.maker,
                order.taker,
                order.makerTokenAmount,
                order.makerTokenAmount,
                order.makerSignature.r,
                order.makerSignature.s,
                order.makerSignature.v);
        }
        return true;
    }

    function fillOrders(Order[] orders) public returns (bool) {
        for (uint256 i = 0; i < orders.length; i++) {
            Order memory currOrder = orders[i];
            addToken(currOrder.makerToken);
            addToken(currOrder.takerToken);
            if (currOrder.fillingPartial && partialFills[currOrder.orderHash]) {
                // must check that orders are not cancelled
                currOrder.takerToken.call(
                    bytes4(keccak256("transferFrom(address, address, uint256)")),
                    currOrder.taker, currOrder.maker, currOrder.takerTokenSupplied);
                // how to ensure that the full amount has been paid by the order taker
                currOrder.makerToken.call(
                    bytes4(keccak256("delegatedTransfer(address, address, uint256, uint256, bytes32, bytes32, uint8 v)")),
                    currOrder.maker,
                    currOrder.taker,
                    currOrder.makerTokenAmount,
                    currOrder.makerTokenAmount,
                    currOrder.makerSignature.r,
                    currOrder.makerSignature.s,
                    currOrder.makerSignature.v);
            } else if (!currOrder.fillingPartial) _newOrder(currOrder);
            removeToken(currOrder.makerToken);
            removeToken(currOrder.takerToken);
        }
    }

    function cancelOrder(ECDSASignature makerSignature, uint256 _messageValue) public returns (bool) {
        tokenFunctions.invalidateSignature(address(this), _messageValue, makerSignature.r, makerSignature.s, makerSignature.v);
        // what to hash to add to cancelledOrders mapping
        revert("Order has been cancelled.");
        return true;
    }
}