# Creating the Atomic Swap Proof System

We want to support the ability to trade different AZTEC assets confidentially and the atomic swap zero-knowledge proof is the most efficient method that enables this.  

In order to incorporate the proof system into our AZTEC zero-knowledge validation engine several steps must be completed. We can break this down into a sequence of phases

### Phase 1

1. Write the javascript code required to construct the atomic-swap zero knowledge proof
2. Write the javascript code required to verify the atomic-swap zero knowledge proof, and use it to write a set of unit tests checking the proof construction algorithm works
3. Write a smart contract that verifies the atomic-swap zero knowledge proof, as a stand-alone smart contract (like AZTEC.sol)

When this is achieved we will have the ability to verify on-chain proofs. We still need a way of integratin this proof verification engine into a condidenfial AZTEC asset

### Phase 2

Phase 2 is something that we'll be both be developing (in addition to Paul when he joins us) as this is a large piece of work. I'll sketch it out below but will provide more detailed docs later on.

1. Write an upgradeable 'AZTEC cryptographic engine'. This smart contract will take in a zero-knowledge proof (and a proof ID) and forward the proof to either AZTEC.sol or the atomic swap smart contract (depending on what the proof does). This smart contract will need to be upgradeable, which adds a lot of complexity (we'll need to spec this out separately)
2. Modify AZTECERC20Bridge.sol to have a 'confidentialTransferFrom' method. This is a large piece of work that will need to be specced out independantly


With that in mind, implementing phase 1 should be the focus for now.

### Constructing a javascript proof module

The structure of the module should be very similar to ```proof.js```. We will need the following method:  

```constructAtomicSwap(notes)```  

The ```notes``` input should have the following structure:  

```
{
    makerNotes: {
        bidNote,
        askNote,
    },
    takerNotes: {
        bidNote,
        askNote,
    },
}
```

Each entry (bidNote, askNote) will be a note object created by ```aztec-crypto-js/note/note.js```. See my ```feature-open-source-release``` branch to see how this module is structured.  

I will be merging this branch into master when I get into the office, so that you can branch off of master to perform your work.
