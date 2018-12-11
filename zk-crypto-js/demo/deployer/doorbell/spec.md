# Spec for the Doorbell smart contract deployment
A deployer script will be created that deploys the doorbell smart contract to one of the Ethereum testnets. Test driven development techniques are pursued.

It will have the following structure:
1. deployDoorbell
2. updateDoorbell

## Setup
There is a deployer.js script that sets up many of the required methods and variables. There is a web3Listener script, which appears to 

## deployDoorbell
This should get the contract address and instantiate a contract with the abi and address. 

There should also be an error statement that throws if the contract has already been deployed.

It needs to acquire the transactionHash and create the transaction that sends the contract.

## updateDoorbell
Not too sure what the purpose of this is



# Questions for Zac
1. Why did he pick the wallet addresses that he did?