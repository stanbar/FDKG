Tendermint is software for securely and consistently replicating an application on many machines. It tolerates up to 1/3 of malicious nodes in the network.

The software consists of two components:
1. a blockchain consensus engine (Tendermint Core), ensures that the same transactions are recorded on every machine in the same order.
2. a generic application interface (Application BlockChain Interface, ABCI), enables the transactions to be processed in any programming language.

Tendermint is easy, simple, and highly performant—exactly what we need.

Tendermint is a generalisation of two types of applications: a distributed key-value store (zookeeper, etcd or consul) and distributed ledgers—blockchains.

Tendermint can be used as a replacement for the consensus engines of other blockchains.

# ABCI
ABCI allows for the replication of applications written in any programming language.

Most of the blockchains have monolithic design. Each blockchain is a single program that handles: p2p connectivity, "mempool" broadcasting of the transactions, consensus on the most recent block, account balances, TC contracts, user-level permissions, etc.

Tendermint decouple the blockchain into:
1. P2P layers
2. consensus engine
3. application state

We do this by abstracting away the details of the application to an interface, which is implemented as a socket protocol.

Tendermint Core (the "consensus engine") communicates with the application via a socket protocol that satisfies the ABCI.

Bitcoin using Tendermint core and ABCI:
Tendermint Core:
- Sharing blocks and transactions between nodes.
- Establishing a canonical/immutable order of transactions (the blockchain).

The application will be reponsible for:
- Maintaining the UTXO database.
- Validating cryptographic signatures of transactions.
- Preventing transactions from spending non-existent transactions.
- Allowing clients to query the UTXO database.


ABCI consist of 3 primary message types that get delivered from the core to the application. The application replies with corresponding response messages.

Messages are delivered from Tendermint Core -> ABCI

1. The **DeliverTx** message is the main message of the app. Each transaction is delivered with this message. App needs to validate the tx and then apply it to the current state.  
2. The **CheckTx** message is a dry run of **DeliverTx**. It does not apply it to the current state, just check wheter the tx should be placed into mempool and broadcasted to other nodes.
3. The **Commit** message is basically a hash of the current state which will be used in the following block, to distinguish from forks.

