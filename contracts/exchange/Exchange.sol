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
        uint256 makerTokenAmount;
        uint256 takerTokenRequested;
        uint256 takerTokenSupplied; // the taker might not completely fill the maker's order
        ECDSASignature makerSignature;
        ECDSASignature takerSignature;
        bool fillingPartial; // is this order filling an order that has already been partially filled?
        bytes32 orderHash; // a hash of all the order parameters
    }
    
    mapping(bytes32 => bool) partialFills;
    mapping(address => bool) tokenRegistry;
    mapping(bytes32 => bool) cancelledOrders;
    address owner;
    Order[] allOrders;

// ------------------------------------
    // event DebugUint(uint val);
    event DebugUint256(uint256 val);
    event DebugBytes32(bytes32 val);
    event DebugBool(bool val);
    event DebugUint8(uint8 val);
    event DebugAdd(address val);
// ------------------------------------

    constructor() public {
        owner = msg.sender; // We will want to upgrade this to use a more distributed governance mechanic, but this will work fine for now
    }

    /// @dev Assembles a single order struct
    /// @param orderAddresses is [maker, taker, makerToken, takerToken]
    /// @param orderValues is [makerTokenAmount, takerTokenRequested, takerTokenSupplied]
    function assembleOrder(
        address[4] orderAddresses,
        uint256[3] orderValues,
        bytes32 makerSignatureR, bytes32 makerSignatureS, uint8 makerSignatureV,
        bytes32 takerSignatureR, bytes32 takerSignatureS, uint8 takerSignatureV,
        bool fillingPartial,
        bytes32 orderHash
    ) public returns (bool) {
        Order memory currOrder = Order({
            maker: orderAddresses[0],
            taker: orderAddresses[1],
            makerToken: orderAddresses[2],
            takerToken: orderAddresses[3],
            makerTokenAmount: orderValues[0],
            takerTokenRequested: orderValues[1],
            takerTokenSupplied: orderValues[2],
            makerSignature: ECDSASignature(makerSignatureR, makerSignatureS, makerSignatureV),
            takerSignature: ECDSASignature(takerSignatureR, takerSignatureS, takerSignatureV),
            fillingPartial: fillingPartial,
            orderHash: orderHash
        });
        allOrders.push(currOrder);
        return true;
    }

    function addToken(address tokenAddress) public {
        tokenRegistry[tokenAddress] = true;
    }

    function removeToken(address tokenAddress) public {
        tokenRegistry[tokenAddress] = false;
    }

    function _newOrder(Order order) public returns (bool) {
        UsefulCoin takerToken = UsefulCoin(order.takerToken);
        UsefulCoin makerToken = UsefulCoin(order.makerToken);
        if (order.takerTokenSupplied < order.takerTokenRequested) {
            partialFills[order.orderHash] = true;
            takerToken.delegatedTransfer(
                order.taker,
                order.maker,
                order.takerTokenSupplied,
                order.takerTokenRequested,
                order.takerSignature.r,
                order.takerSignature.s,
                order.takerSignature.v
            );
        } else {
            takerToken.delegatedTransfer(
                order.taker,
                order.maker,
                order.takerTokenRequested,
                order.takerTokenRequested,
                order.takerSignature.r,
                order.takerSignature.s,
                order.takerSignature.v);
            makerToken.delegatedTransfer(
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
                UsefulCoin takerToken = UsefulCoin(currOrder.takerToken);
                UsefulCoin makerToken = UsefulCoin(currOrder.makerToken);
                takerToken.transferFrom(currOrder.taker, currOrder.maker, currOrder.takerTokenSupplied);
                // how to ensure that the full amount has been paid by the order taker
                makerToken.delegatedTransfer(
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

    function fillOrdersTemp() public returns (bool) {
        for (uint256 i = 0; i < allOrders.length; i++) {
            Order memory currOrder = allOrders[i];
            addToken(currOrder.makerToken);
            addToken(currOrder.takerToken);
            if (currOrder.fillingPartial && partialFills[currOrder.orderHash]) {
                // must check that orders are not cancelled
                UsefulCoin takerToken = UsefulCoin(currOrder.takerToken);
                UsefulCoin makerToken = UsefulCoin(currOrder.makerToken);
                takerToken.transferFrom(currOrder.taker, currOrder.maker, currOrder.takerTokenSupplied);
                // how to ensure that the full amount has been paid by the order taker
                makerToken.delegatedTransfer(
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