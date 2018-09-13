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
        bool fillingExistingPartial; // is this order filling an order that has already been partially filled?
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

    /// @dev Assembles an Order struct
    /// @param orderAddresses is [maker, taker, makerToken, takerToken]
    /// @param orderValues is [makerTokenAmount, takerTokenRequested, takerTokenSupplied]
    /// @param fillingExistingPartial false if creating new full or partial order, true if filling an already existing partial order
    function assembleOrder(
        address[4] orderAddresses,
        uint256[3] orderValues,
        bytes32 makerSignatureR, bytes32 makerSignatureS, uint8 makerSignatureV,
        bytes32 takerSignatureR, bytes32 takerSignatureS, uint8 takerSignatureV,
        bool fillingExistingPartial,
        bytes32 orderHash
    ) public returns (uint256) {
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
            fillingExistingPartial: fillingExistingPartial,
            orderHash: orderHash
        });
        allOrders.push(currOrder);
        return allOrders.length - 1;
    }

    function addToken(address tokenAddress) public {
        tokenRegistry[tokenAddress] = true;
    }

    function removeToken(address tokenAddress) public {
        tokenRegistry[tokenAddress] = false;
    }
 
    // /// @param fillingExistingPartial false if creating new full or partial order, true if filling an already existing partial order
    // function fillOrders(
    //     address[][] allOrderAddresses,
    //     uint256[][] allOrderValues,
    //     bytes32[] allMakerSignatureR, bytes32[] allMakerSignatureS, uint8[] allMakerSignatureV,
    //     bytes32[] allTakerSignatureR, bytes32[] allTakerSignatureS, uint8[] allTakerSignatureV,
    //     bool[] allfillingExistingPartial,
    //     bytes32[] allOrderHash
    // ) public returns (bool) {
    //     emit DebugUint256(3); //allOrderAddresses[0].length);
    //     // for (uint256 i = 0; i < allOrderHash.length; i++) {
    //     //     _fillOrder(
    //     //         Order({
    //     //             maker: allOrderAddresses[i][0],
    //     //             taker: allOrderAddresses[i][1],
    //     //             makerToken: allOrderAddresses[i][2],
    //     //             takerToken: allOrderAddresses[i][3],
    //     //             makerTokenAmount: allOrderValues[i][0],
    //     //             takerTokenRequested: allOrderValues[i][1],
    //     //             takerTokenSupplied: allOrderValues[i][2],
    //     //             makerSignature: ECDSASignature(allMakerSignatureR[i], allMakerSignatureS[i], allMakerSignatureV[i]),
    //     //             takerSignature: ECDSASignature(allTakerSignatureR[i], allTakerSignatureS[i], allTakerSignatureV[i]),
    //     //             fillingExistingPartial: allfillingExistingPartial[i],
    //     //             orderHash: allOrderHash[i]
    //     //         }));
    //     // }
    // }

    function fillOrdersTemp(uint256 index) public returns (bool) {
        _fillOrder(allOrders[index]);
    }

    function _fillOrder(Order order) internal returns (bool) {
        UsefulCoin takerToken = UsefulCoin(order.takerToken);
        UsefulCoin makerToken = UsefulCoin(order.makerToken);
        uint256 boundedTakerToken = order.takerTokenSupplied;
        if (order.takerTokenSupplied > order.takerTokenRequested) boundedTakerToken = order.takerTokenRequested;
        uint256 makerToTransfer = order.makerTokenAmount.mul(boundedTakerToken).div(order.takerTokenRequested);
        require(
            !cancelledOrders[keccak256(abi.encode(address(this), order.makerTokenAmount, order.makerSignature))] &&
            !cancelledOrders[keccak256(abi.encode(address(this), order.takerTokenRequested, order.takerSignature))],
            "This order has been cancelled.");

        if (!order.fillingExistingPartial) {
            takerToken.delegatedTransfer(
                order.taker, order.maker,
                boundedTakerToken, boundedTakerToken,
                order.takerSignature.r, order.takerSignature.s, order.takerSignature.v);
            makerToken.delegatedTransfer(
                order.maker, order.taker,
                makerToTransfer, order.makerTokenAmount,
                order.makerSignature.r, order.makerSignature.s, order.makerSignature.v);
        } else {
            require(partialFills[order.orderHash], "The partial order you are trying to fill is invalid");
            require(!cancelledOrders[order.orderHash], "This partial order has been cancelled");
            takerToken.transferFrom(order.taker, order.maker, boundedTakerToken);
            makerToken.transferFrom(order.maker, order.taker, makerToTransfer);
            delete partialFills[order.orderHash];
        }

        if (order.takerTokenSupplied < order.takerTokenRequested) {
            partialFills[keccak256(
                abi.encode(
                    order.maker, order.makerToken, order.takerToken,
                    order.makerTokenAmount - makerToTransfer,
                    order.takerTokenRequested - order.takerTokenSupplied
            ))] = true;
        }
        return true;
    }

    function cancelOrder(address tokenAdd, ECDSASignature signature, uint256 _messageValue) public returns (bool) {
        UsefulCoin token = UsefulCoin(tokenAdd);
        token.invalidateSignature(address(this), _messageValue, signature.r, signature.s, signature.v);
        cancelledOrders[keccak256(abi.encode(address(this), _messageValue, signature))] = true;
        return true;
    }

    function cancelPartial(bytes32 orderHash) public returns (bool) {
        delete partialFills[orderHash];
        cancelledOrders[orderHash] = true;
        return true;
    }
}