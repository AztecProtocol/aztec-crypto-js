# Doorbell smart contract test specification

The purpose of the Doorbell smart contract is to extract a user's public key from their Ethereum address. 

This serves two purposes: 

1. Most users will not know their public key (as it's the last 20 bits of the hash of their address)
2. It makes the user interface simpler - the user does not need to undergo a two stage interactive process of supplying first their
    address and then their public key

## Global environment setup
Most significant aspect is the creation of a WebsocketProvider - we open a communication channel/connection instance to the local host port 8545. This allows us to connect to the testing environment setup by Ganache for example.

## Tests

There are 3 broad buckets of tests that the testing script performs:
1. Validation of the on chain smart contract pinging script
2. Validation of the off chain utility script methods
3. Validation of the combined package (on chain + off chain) 

## Validating on chain smart contract pinging script

### Setup
Starts with a before() test environment setup block. It deploys the contract, assigns a userAddress and then pings the smart contract script. The block number that the ping is associated with is extracted.

### Test
Extracts the stored Block number from the public *addressBlockMap* stored in the smart contract. 

Checks that it is equal to the the original block number inputted.

## Validating off chain utility script methods
### Setup
Deploys the doorbell contract and gets the available Ethereum accounts. 

We then manually create an Ethereum account. We supply a random private key to the ecdsa.keyPairFromPrivate() method and in return get the outputs: privateKey, address and publicKey. 

Next, a transaction is sent to this address. The transaction contains 0.5 ether - the purpose of this transaction is to load the account we have just created with ether. We will be spending some of this later/using it to pay for gas. 

Following this, we create a raw transaction object using the open source 'ethereumjs-tx' library. The data field is defined by 

### Test
There are four tests: 

#### Validate that we can get the transaction list from a block
Extracts all the transactions in the block defined by an input blocknumber. It then loops through each of these transactions and checks to see if they equal the input transaction.

#### Validate that given an array of tx-hashes and an address, we can recover the ecdsa parameters
Calls the helpers.getECDSAParams() method to extract the ecdsa parameters for the input transaction and userAddress.

#### Validate that the two methods that calculate the address from the public key, give consistent outputs
Has two stages to it:
1. Extracts the public key using helpers.getKey(web3, tx, v, r, s)
2. Determiens the Ethereum address associated with the public key using two different methods. Checks if they output the same address

#### Validate that the public key can be successfully extracted from ecdsa parameters
Firstly extracts the public key, and converts the buffer type to a hexadecimal number. 

It then performs a series of tests to check that the type, length and format of the outputted key are consistent with standard public key formats. 

Lastly, it extracts the Ethereum address associated with the public key. It then checks that this address matches the original address from which the transaction was sent. 


