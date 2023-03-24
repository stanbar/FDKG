Substrate is a Rust-based framework for building custom blockchain applications, in a standardised way so you can (optionally) plug them into Polkadot.

Substrate uses:
- Rust is the core programming language.
- Webassembly as an execution environment for application logic.

Substrate allows changing multiple things (consensus, networking, database), but WebAssembly as a runtime for your application logic can not be changed.

A substrate node provides a layered environment with two main elements.
- A **client with outer node services** that handles network activity such as peer discovery, managing transaction requests, reaching consensus with peers, and responding to RPC calls.
- A **runtime** that is responsible for the state transition function of your business logic.

#### Outer node

Everything that takes place outside the runtime.
- Storage: basically KV storage layer
- p2p networking: communicating with other peers using libp2p.
- Consensus: communicating with other nodes in order to agree on the common state of the blockchain.
- RPC: accept HTTP and WebSocket requests to allow users to interact with the network.
- Telemetry: collects and provides access to node metrics through an embedded Prometheus server.
- Execution env: selecting execution environment—WebAssembly or native Rust—for the dispatched calls.

### Runtime

The runtime is the core of your application business logic. It determines the validity of messages. It is responsible for updating the state. 

Runtime is responsible for handling everything that happens on-chain. 

The substrate runtime is designed to compile to WebAssembly (wasm) byte code. It allows for:
- Forkless upgrades
- Multi-platform compatibility
- Runtime validity checking
- Validation proofs for relay chain consensus mechanism.

The same way outer node provide information to the runtime, the runtime uses host functinos to communicate with the outer node or outside world.

Runtime is a state transition function (STF).

### Runtime API

Runtime API facilitates the communication between the outer node and runtime.

Every runtime must implement the Core and Metadata interfaces. Optionally there is number of other interfaces to implement like: BlockBuilder, TaggedTransactionQueue, OffchainWorkerApi, AuraApi, SessionKeys, GrandpaApi, AccountNonceApi, AccountNonceApi, TransactionPaymentApi, Benchmark.

### Core primitives

Substrate also defines the core primitives that the runtime must implement. Substrate tries to minimalise the assumptions on your primitive types, however, you have to align to some constraints. The core primitives are: Hash, DigestItem, Digest, Extrinsic, Header, Block, BlockNumber.

The substrate is much more sophisticated in comparison to Cosmos's [[Tendermint]].

#### FRAME

FRAME is a tool for runtime developers. It encompasses a significant number of modules and support libraries that simplify runtime development. In Substrate, these modules are called pallets. For example, there are pallets that provide a framework of business logic for staking, consensus, governance and other common activities.



**Aura** consensus uses authority round with a round robin rotating set of authorities.
