# Doorbell smart contract test specification

The purpose of the Doorbell smart contract is to extract a user's public key from their Ethereum address. 

This serves two purposes: 

1. Most users will not know their public key (as it's the last 20 bits of the hash of their address)
2. It makes the user interface simpler - the user does not need to undergo a two stage interactive process of supplying first their
    address and then their public key

Integration tests have been written in the *extractPublicKey.spec.js* script, to investigate and confirm functionality of the *doobell.sol*, *extractPublicKey.js* and *helpers.js* scripts.

## web3Congfig.js
Instantiates a WebsocketProvider - we open a communication channel/connection instance to the local host port 8545. This allows us to connect to the testing environment setup by Ganache.

## extractPublicKey.js
### Tests

There are 2 broad buckets of tests that the testing script performs:
1. Validation of the on chain smart contract pinging script
2. Validation of the off chain utility script methods

### Validating on chain smart contract pinging script

#### Setup
Starts with a before() test environment setup block. It deploys the contract, assigns a userAddress and then pings the smart contract script. The block number that the ping is associated with is extracted.

#### Test
Extracts the stored Block number from the public *addressBlockMap* mapping stored in the smart contract. 

Checks that it is equal to the the original block number inputted.

### Validating off chain utility script methods
#### Setup
Deploys the doorbell contract and gets the available Ethereum accounts. 

We then manually create two Ethereum account. We supply a random private key to the ecdsa.keyPairFromPrivate() method and in return get the outputs: privateKey, address and publicKey. 

One account acts as a dummy test (for testing papers later) and the other will be used to send a transaction to the deployed contract. Both accounts are loaded with Ether, by transferring the Ganache pre-loaded accounts. 

After being loaded with ether, raw transaction objects are defined, signed and sent. The transaction hashes are stored, for potential use later.

#### Test
There are five tests: 

##### Validate that we can detect the transaction in the block
Extracts all the transactions in the block defined by an input blocknumber. It then checks to see if the extracted transactionArray contains the stored hash of the initial transaction - which was used to set the block number in the doorbell smart contract.

##### validate that we can recover ecdsa params for a sending address from an array of tx hashes
Adds the test transaction into the transactionArray. Then calls the helpers.getECDSAParams() method to extract the ecdsa parameters for the input transaction and userAddress. Checks that the data is extracted for the correct transaction hash. 

##### Validate that the public key can be successfully extracted from ecdsa parameters
Firstly extracts the public key, and converts the buffer type to a hexadecimal number. 

It then performs a series of tests to check that the type, length and format of the outputted key are consistent with standard public key formats. 

Lastly, it extracts the Ethereum address associated with the public key. It then checks that this address matches the original address from which the transaction was sent. 

##### Validating that the extractPublicKey script successfully extracts the public key
Checks that the extractPublicKey module correctly extracts the public key.

##### Validate that an informative error is returned when attempting to get public key from address that has not rung
Checks that the correct error is returned when an incorrect Ethereum address (one that has not rung the doorbell smart contract) attempts to extract it's public key.


