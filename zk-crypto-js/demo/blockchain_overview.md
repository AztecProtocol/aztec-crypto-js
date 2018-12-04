# How do we pull the cryptography out of a paper and into the real workd?

High level overview:
* Create a cryptogrpahic representation of value
* Define a protocol that enables this 'value' to be traded confidentially

Fundamental representation of value is a 'note'

### The AZTEC Note

An AZTEC note has the following:

* Elliptic curve point ```gamma```
* Elliptic curve poitn ```sigma```
* An Ethereum address defining an owner

An AZTEC commitment, ```\gamma^{k}h^{a} = \sigma```, cannot have its owner defined as the entity that knows ```a```, because both a note creator and a note recipient must know ```a```. So we define an explicit owner.

In order to **spend** a note, an ECDSA signature, where the message is a hash of the AZTEC note, must be signed by the note owner.

## Join Split Transactions

* input notes
* output notes
* (sometimes) a ```kPublic``` value, if transferring from public value to confidential value

In a join split transaction, the sum of the values of the input notes must be equal to the sum of the values of the output notes, plus ```kPublic```.

'negative' kPublic is when kPublic > p/2. (p = order of elliptic curve generator group).

If kPublic is negative then this represents converting kPublic number of ERC20 tokens into AZTEC note form.

If kPublic is positive then this represents converting AZTEC notes into public ERC20 tokens.

### What does a note owner sign?

A hash of the following:

* the note coordinates
* the zero knowledge proof challenge
* the address of the transaction sender

The signature message contains the address of the transaction sender, to stop a third party from extracting a note owner's signature from a *pending* transaction, and using it in their own transaction *before* the pending transaction gets mined.