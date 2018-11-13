# AZTEC Implementation Roadmap

AZTEC as a product offering can be broken down into three buckets

## 1. Getting the base AZTEC protocol production ready (for use by third parties)

* Publish AZTEC zero-knowledge validator smart contracts on all ethereum networks (mainnet, ropsten, rinkeby etc)
* Define an AZTEC token standard, with reference implementations coded as smart contracts
* Publish a javascript API that constructs AZTEC proofs and dispatches them to the blockchain (and abstracts away all cryptography)
* Have the AZTEC protcol paper in a publishable state
* Build a landing page that describes the AZTEC protocol and its use cases
* (optional?) implement our bn128 elliptic curve cryptography library in raw EVM code to cut gas costs

## 2. Have the AZTEC decentralized exchange and associated API production ready

* Define the AZTEC decentralized exchange and its interface, with a working implementation on rinkeby
* Publish a javascript API for relayers, that enables efficient construction of AZTEC orders (and abstracts away all cryptography)
* Upgrade base AZTEC javascript API and target towards asset builders (perhaps define something more advanced than an ERC20 token for financial instruments)
* Have the AZTEC decentralized exchange protocol in a publishable state
* Build a sign-up page for relayers and enable registration of relayers on our platform

## 3. Trusted Setup: implement a process by which a multiparty computation can be used to construct the setup database

* Publish a description of the trusted setup protocol and get potential first-users of the protocol to participate
* Write software that enables participants to complete both steps of the two-phase multiparty computation
* Implement the trusted setup protocol and construct our trusted setup database

## 4. Add in monetization features

* Create an 'auth0'-style server that provides trusted setup database API access to relayers signed up to our platform
* Write Chrome extension that enables users to construct and sign AZTEC proofs securely
* Write C-implementation of AZTEC proof construction for open-source hardware wallets (ledger, trezor)

## 5. Protocol Upgrades

* Anonymous weighted voting
* Interest rate payments
* Secure anonymous identity schemes
* Wrapping multiple AZTEC proofs in a ZK-SNARK