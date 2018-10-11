# AZTEC protocol specification

The AZTEC protocol enables digital assets where ownership records, and transfers, are confidential - no information about the values being transferred is released.

### Table of Contents

* [AZTEC Note Definition](#the-aztec-note)
* [AZTEC Type Definitions](#type-definitions)
* [AZTEC validator smart contract specification](#the-aztec-validator-smart-contract)
* [AZTEC token smart contract specification](#aztec-token-smart-contract-erc20-bridge)
* [AZTEC trade validator smart contract specification](#trade-validator-smart-contract)
* [AZTEC decentralized exchange smart contract specification](#decentralized-exchange-smart-contract)
  
## The AZTEC Note

The AZTEC note is the fundamental representation of value. The note itself is composed of the following data:

* Two AZTEC commitments. A commitment is an elliptic curve point (128 bytes of data)
* The note's viewing public key (another elliptic curve point: 64 bytes)
* The note's spending public key (same as above, 64 bytes)

The note, fully formed, is 256 bytes of data.

## The Join-Split Transaction

The join-split transaction is the fundamental transaction type of the AZTEC protocol. It takes as inputs:

1. A set of input note commitments (at least one)
2. A set of output note commitments (at least one)
3. Zero-knowledge proof data (32 bytes + 64 bytes per input/output note)

Join-split transactions are constructed using note **viewing** keys. These are not referenced directly in any of the smart contracts - they are used to sign zero knowledge proofs but explicit representations of the viewing keys are not needed on-chain. These transactions are then signed by the **spending** key.


---

## Type Definitions

A word on types. Due to the Solidity smart contract ABI being...not so developed, it is not possible to construct transactions that call external functions that use Structs as input parameters. This is because until recently there was no specification for how structs should be...well, structured.

We use structs here as proxies for static-sized uint arrays - One solution is to have our smart contract functions accepting only uint arrays as input parameters, and we'll internally treat the parameters as if they were structs (and provide an interface to format external calls to our contracts appropriately).

### ```Point```
```
struct Point {
    uint x;
    uint y;
}
```

An elliptic curve coordinate.

### ```Commitment```
```
struct Commitment {
    Point gamma;
    Point sigma;
    uint k;
    uint a;
}
```
Commitment represents a zero-knowledge AZTEC commitment (two points) an two scalars used to validate properties about the commitment in zero-knwoeldge

### ```Note```
```
struct Note {
    Commitment comm;
    address owner;
}
```

A Note is a commitment with an associated owner. The note can only be modified/used if the transaction has an accompanying ECDSA signature signed by the note owner

### ```Signature```
```
struct Signature {
    uint r;
    uint s;
    uint8 v;
}
```

ECDSA signature parameters

---

# The AZTEC Validator Smart Contract

The AZTEC validator takes, as input, zero knowledge proof variables and outputs true if the transaction is cryptographically sound. Otherwise the contract will throw an error.

The validator smart contract does not have any persistent state and does not validate whether input notes exist - the higher-level contract that interfaces with the validator (the AZTEC token smart contract) does this.

## Methods

Each of these transactions will return ```true``` if the zero knowledge proof is valid. Otherwise they will throw an error.

### ```validateJoinSplit(Commitment[] inputCommitments, Commitment [] outputCommitments, uint challenge, uint[4] t2)```

### ```validateCommit(Commitment[] outputCommitments, uint challenge, uint value, uint[4] t2)```

### ```validateReveal(Commitment[] inputCommitments, uint challenge, uint value)```

The validateReveal zero-knowledge proof doesn't need ```t2```.

---

# AZTEC Token Smart Contract (ERC20 bridge)

The AZTEC token smart contract uses the AZTEC validator to create and trade confidential representations of a digital asset. The digital asset will likely have a public representation, so we focus on interfacing with a traditional digital asset represented by an ERC20 token.

### State variables

* ```token```: the Ethereum address of the linked ERC20 token
* ```noteRegistry```: a ```mapping(uint => bool)``` of unspent notes
* ```invalidSignatures``` a ```mapping(uint => bool)``` of signatures that have purposefully been invalidated by the signer. For example, if a note owner signs a message giving control of the note to a smart contract proxy, and then changes their mind.
The note registry functions like an UXTO database. It is a key:value mapping. The key is the keccak256 hash of a note's data. The value is a boolean that defines whether the note both exists and is unspent.

### Global Variables

* ```validator``` address of the validator smart contract
* ```tradeValidator``` address of the trade validator smart contract
* ```t2``` an elliptic curve point used to validate range proofs (created by the trusted setup algorithm. The validator smart contract is setup-agnostic and must be provided a specific value of ```t2``` to validate proofs)


## Methods

### ```commit(Note[] outputNotes, uint challenge, uint value)```

* Validate that ```token.balanceOf(msg.sender) > value```
* Call ```token.transferFrom(msg.sender, this, value)``` and validate the call succeeds
* Validate that ```validator.validateCommit(outputnotes, challenge, , t2)``` returns true
* Validate that output notes do not currently exist in ```noteRegistry```
* If the above are all true, add the hash of each output note into ```noteRegistry```

### ```reveal(Note[] inputNotes, uint challenge, uint value, Signature[] inputSignatures)```

* Validate that each element of ```inputNotes``` exists in ```noteRegistry```
* Validate that each note has a matching ECDSA signature in ```inputSignatures``` and ```invalidSignatures[keccak256(signature, message, msg.sender)]``` is ```false```. ```message``` is a keccak256 hash of the relevant inputNote
* Validate that ```validator.validateReveal(inputNotes, challenge, value)``` returns true
* If the above are all true, remove each input note from ```noteRegistry``` and call ```token.transfer(msg.sender, value)```

### ```joinSplit(Note[] inputNotes, Note[] outputNotes, uint challenge, Signature[] inputSignatures)```

* Validate that each element of ```inputNotes``` exists in ```noteRegistry```
* Validate that each note has a matching ECDSA signature in ```inputSignatures``` and ```invalidSignatures[keccak256(signature, message, msg.sender)]``` is ```false```. ```message``` is a keccak256 hash of the relevant inputNote
* Validate that ```validator.validateJoinSplit(inputNotes, outputNotes, challenge, value, t2)``` returns true
* Validate that output notes do not currently exist in ```noteRegistry```
* If the above are all true, add the hash of each output note into ```noteRegistry``` and remove each input note from ```noteRegistry```

### ```exchangeTransfer(Note[] inputNotes, Note[] outputNotes)```

* Validate that ```exchangeValidator.validatedProofs(inputNotes, outputNotes)``` is set to true
* If the above is true, delete inputNotes from ```noteRegistry``` and create ```outputNotes```

### ```invalidateSignature(Signature signature, uint message)```

* If ```signature``` was signed by ```msg.sender```, set ```invalidSignatures[keccak256(signature, message, msg.sender)]``` to ```true```

---

# Trade Validator Smart Contract

The trade validator smart contract validates zero-knowledge proofs that describe a cross-asset exchange of notes between an order **maker** and an order **taker**. Multiple smart contracts need to interface with the trade validator smart contract to check on the outcome of a proof - for this reason valid proofs are logged as state variables that can be referenced by other smart contracts

## Global variables:

* ```tau``` The denominator used to prove ratios. If a taker is partially filling an order, the fill ratio is expressed by the quantity ```(takerRatio / tau)```, which defines an exchange rate. Sort of. Integer arithmetic with floor-rounding in zero knowledge is tricky. ```tau``` is hardcoded to be...something. Probably ```100,000```.

## Definitions

```residual``` refers to remainders when evaluating integer ratios. Specifically, the following two equations are evaluated per taker:

```(maker issue note value) * (takerRatio) + (receipt residual) == (taker receipt note value) * (tau)```  
```(maker receipt note value) * (takerRatio) + (issue residual) == (taker issue note value) * (tau)```
```residual < (takerRatio)```

The residuals basically represent rounding errors. They are needed because arithmetic in zero-knowledge is strictly over integers. Residuals effectively represent value lost by the taker due to integer rounding - it is in their interest to create matching ratios such that the residual is as small as possible. Ideally it will be zero, but that is not possible if the maker has chosen an inconvenient ratio between issue note and receipt note.  

The residual must be expressed in zero-knowledge in order to prevent information about the note values leaking (for a given ratio and a given residual, the number of possible values the maker/taker notes could take may be very limited, leaking information. Particularly if the issue note value and the taker note value are co-prime).  

## Exchange Validator Methods

### ```validateTrade(Commitment makerIssueNote, Commitment makerReceiptNote, Commitment[] takerIssueNotes, Commitment[] takerReceiptNotes, Commitment[] takerIssueResiduals, Commitment[] takerReceiptResiduals, uint challenge)```

This function throws an error if the relevant zero-knowledge proof is not valid.

If the proof is valid, then state variables are set. Specifically:

```validatedProofs``` A key:value mapping. The key is a keccak256 hash of input/output note commitments. For a valid proof, the following sets of data are used as keys:  

```keccak256(keccak256(makerIssueNote, takerReceiptNotes), msg.sender)```  
```keccak256(keccak256(makerReceiptNote, takerIssueNotes), msg.sender)```

Recursive keccak hashing is used to enable contracts to efficiently clear variables they have set.  

Each of these keys has their value set to ```true```. Individual AZTEC tokens can then check ```validatedProofs``` to determine if a set of input/output notes provided to them by an exchange has been validated (preventing redundant work)  

### ```clear(uint[] keys)```

Sets ```validatedProofs[keccak256(key, msg.sender)]``` to false. Refunds ~10,000 gas per cleared storage variable. 

---

# Decentralized Exchange Smart Contract

The Decentralized exchange smart contract interfaces with the Exchange Validator smart contract and AZTEC token smart contracts to facilitate confidential trades between entities that do not know one another. Orders are matched by off-chain relayers, beween an order **maker** and at least one order **taker**. The relayers are provided with the viewing keys of orders which enables them to construct the required zero-knowledge proofs. The relayer will then package up the order data, zero knowledge proof and maker/taker signatures and send the transaction to the decentralized exchange smart contract

## Global variables

```tradeValidator``` is the address of the trade validator smart contract.

## Methods

### ```processOrder(Note makerIssueNote, Note makerReceiptNote, Note[] takerIssueNotes, Note[] takerReceiptNotes, Commitment[] takerIssueResiduals, Commitment[] takerReceiptResiduals, Signature makerIssueSignature, Signature[] takerIssueSignatures, address issueToken, address receiptToken)```

This function signature is horrific, perhaps we can create something a bit...neater? ```processOrder``` performs the following:

* Call ```tradeValidator.validateTrade``` and validate transaction returns true
* Call ```issueToken.exchangeTransfer``` and validate call succeeds
* Call ```receiptToken.exchangeTransfer``` and validate call succeeds
* (optional) call ```tradeValidator.clear``` to free up the two state variabales set in ```validateTrade``` and save some gas

If any of the above calls fails, the transaction throws an error and no state changes are made.