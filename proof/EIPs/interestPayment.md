WORK IN PROGRESS

# Simple Summary
This is a draft document that defines the interface, behaviour and structure of the AZTEC based zero-knowledge dividend computation functionality.

# Abstract
The confidential dividend computation functionality tackles the problem of being able to make a dividend payment on a loan in a confidential manner, when performed on a public blockchain. The loan itself is represented as an encrypted AZTEC note, the percentage rate of dividend is a public variable and the dividend payment is also an AZTEC note. There are two distinct parts of the code base. Firstly, a client side Javascript proof construction module and secondly a verification smart contract. 

# Motivation
Loans have terms and conditions associated with them which often requires a dividend payment to be paid by the loanee back to the lender. If the loan asset is represented as a digital asset on a public blokchain, then currently this is a Currently, if the loan asset is represented on a public blockchain, then the dividend payment and loan are fully public information. This is not desirable for most finance applications and use cases where privacy is required for commercial and regulatory reasons. 

The AZTEC protocol can be used to solve this problem as for the first time it enables confidential transactions on Ethereum. This is achieved, in part, through the introduction of a new type of digital asset referred to as an AZTEC note. A note is an encrypted representation of abstract value and it can be used to define a confidential digital asset - an asset in which both the value and owner are unknown to the outside world. This has no traditional analogue. 

In this way, a loan on the Ethereum blockchain can be represented as a confidential digital asset. A publicly visible dividend rate z, can then be used along with the loan note to construct a zero-knowledge proof that generates a another note with a value equal to the dividend. The owner of the new note would be set as the lender.  

In this way, this EIP makes use of the AZTEC protocol to facilitate the confidential payment of dividend rates.

# Specification
The specification implements the zero-knowledge proof described in the 'Interest payments in zero-knowledge' paper, available at x.

We define two notes: A (loan note) and B (dividend payment note).

There are then two distinct stages to the confidential dividend payment. Firstly, there is the proof construction stage performed by the constructInterestPayment() method in dividendPayment.js. This generates the data associated with a zero-knowledge proof that the maker bid note matches the taker ask note and vice versa. 

Following this, there is a verification stage performed by the AtomicSwap.sol smart contract. This checks if the proof is valid - it if is, then the swap goes ahead and if not then the swap is rejected.  

## dividendPayment.constructInterestPayment()
This implements the P_dividend algorithm as set out in the paper. 

### Inputs: ()
* notes: 

* sender: 

### Outputs: (e)
* proofData: 
* challenge: 


## DividendComputation.sol
This implements the V_dividend algorithm as set out in the paper. The smart contract is written in YUL to enable manual memory management and has one fallback function validateInterestPayment().

### Inputs: (bytes32[6][], uint, bytes32[4])
* bytes32[6][]: a dynamic array of 6 32 byte elements, representing the input proof data. For the purposes of a confidential swap, a static array of 4 elements could be used. However, to maintain consistency across the calldata maps of the various smart contracts in the AZTEC cryptographic engine it was decided to keep this as a dynamic array. A check is included in the contract to ensure it throws if more than 4 notes worth of information is input.
* uint: a 32 byte type representing the challenge
* bytes32[4]: a static 32 byte array of 4 elements representing the trusted setup public key, t_2

### Outputs: (bool)
* bool: a boolean that evalutes to 'true' if the proof was accepted and 'false' if the proof was rejected

### Memory map
To reduce gas costs, a hard-coded memory map has been used. The design is as follows:  
* 0x00:0x20       = scratch data to store result of keccak256 calls
* 0x20:0x80       = scratch data to store \gamma_i and a multiplication scalar
* 0x80:0xc0       = x-coordinate of generator h
* 0xc0:0xe0       = y-coordinate of generator h
* 0xe0:0x100      = scratch data to store a scalar we plan to multiply h by
* 0x100:0x160     = scratch data to store \sigma_i and a multiplication scalar
* 0x160:0x1a0     = stratch data to store result of G1 point additions
* 0x1a0:0x1c0     = scratch data to store result of \sigma_i^{-cx_{i-m-1}}
* 0x220:0x260     = scratch data to store \gamma_i^{cx_{i-m-1}}
* 0x2e0:0x300     = msg.sender (contract should be called via delegatecall/staticcall)
* 0x300:???       = block of memory that contains (\gamma_i, \sigma_i)_{i=0}^{n-1} concatenated with (B_i)_{i=0}^{n-1}

## Gas cost
The cost for a single dividend computation on a single loan is ~x gas. 

# Test Cases

# Implementation

