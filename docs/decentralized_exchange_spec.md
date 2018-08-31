# Decentralized Exchange Specification

The goal of the decentralized exchange is to provide an interface that allows two counterparties to exchange assets via an intermediary 'relayer'.

This is neccessary to enable trustless confidential trading between AZTEC asset classes.

To begin with we will implement a public decentralized exchanged, based on our modified ERC20 token standard.


### An ```Order``` contains the following information:

```
struct Order {
    address maker; // address of order creator
    addrees taker; // address or order filler
    address makerToken; // smart contract address of maker asset
    address takerToken;
    uint makerTokenAmount;
    uint takerTokenRequested;
    uint takerTokenSupplied; // the taker might not completely fill the maker's order
    ECDSASig makerSignature;
    ECDSASig takerSignature;
    bool fillingPartial; // is this order filling an order that has already been partially filled?
    bytes32 makerOrderHash; // a hash of all the maker order parameters
    bytes32 takerOrderHash; // a hash of all the maker order parameters
}
```

In order to fill an Order, the following information must be provided:

### Partial Orders

Supporting partial order fills is important, as it might not be possible for a relayer to completely fill an order.

When partial orders are **created**, a hash of the *state* of the remaining order is logged as a state variable in a mapping: ```mapping(bytes32 => bool) partialFills```

When filling an already partially filled order, the order maker will not be providing an ECDSA signature (as it has already been provided). Instead, the exchange contract references ```partialFills``` to determine the validity of an order.

### Filling orders

Orders are not stored inside the decentralized exchange but are provided as input parameters to a ```fillOrders(Order[] orders)``` function.

If a given order is successful, the ```delegateTransfer``` method of the relevant token is called to transfer the relevant assets. If a partial order is being filled, then ```transferFrom``` is used for the counterparty that is not providing an ECDSA signature (the initial order fill will have set the correct allowance for the exchange smart contract).

If any of the orders fail (invalid signatures, or transfer functions throw) then the entire transaction should ```throw``` (i.e. the entire transaction is unwound and no state changes are made).

### Cancelling Orders

Users must be able to cancel an order they previously submitted to a relayer, if they change their mind. The ```cancelOrder``` method takes an ECDSA signature as the input parameter, whose message is identical to a message provided to the decentralized exchange. This should update the ```mapping(bytes32 => bool) cancelledOrders``` state variable. This state variable must be false for any orders being filled via ```fillOrders```.

If the cancelled order was a partilly filled order, then ```partialFills[takerOrderHash]``` should be set to false.

## Desired Outcomes

### (Upgraded ERC20)

A set of truffle unit tests that perform the following:
tokenRegistry
* Create an upgraded ERC20 smart contract for a test asset
* Instantiate an initial balance registry in the token's constructor for some ethereum addresses provided by Truffle
* Validate that the smart balances are correct
* Validate that ```delegateTransfer``` works as intended (can use a proxy to transfer funds)
* Validate that ```invalidateSignature``` works as intended (after calling this method with a signature, ```delegateTransfer``` will reject a transaction containing the signature)

### Exchange.sol

A set of truffle unit tests that perform the following:

* Create a small set of upgraded ERC20 smart contracts
* Create an Exchange.sol contract and add the created ERC20 contracts to its registry
* Create a set of orders and validate that fillOrders will execute the orders
* After calling fillOrders, validate that the balances of the relevant ERC20 tokens has been updated
* Validate that orders with invalid signatures will fail
* Validate that after calling ```cancelOrder```, attempting to fill the order will fail