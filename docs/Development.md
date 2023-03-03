- Decide on which blockchain to use:
	- Stellar (trust-based consensus, experience, wasm in beta)
	- Ethereum (experience, a lot of zkp tooling, easy to develop, evm)
	- Custom blockchain using Tendermint ([Cosmos SDK](https://v1.cosmos.network/sdk), https://www.npmjs.com/package/tendermint) or [Substrate](http://substrate.io).
- Write down a formal description of the [[Protocol]].
	- [ ] How to achieve dynamic DKG
	- [ ] Which blockchain to use
- Development roadmap:
1. [[Round 1. Setup]]
	1. (hard) Bootstrapping voting:
		1. (hard) Write a procedure allowing the host of the voting to deploy a list of participants (public keys) and a list of candidates on [[Why blockchain|blockchain]].
			  - All PKI-related issues.
			  - Who is the host, and how to authenticate the host? 
			  - Encoding issues.
		2. (medium) Write a procedure allowing the host to encode all required information into a QR code and broadcast it among all eligible voters. 
			  - What needs to be encoded? Just an address of the smart contract? Merkle tree root of the list of participants? Candidates list? Passphrase?
		3. (easy) Write a procedure allowing each of the members to scan the QR code, and "agree and register" by submitting a signature using its private key.  
	2. (hard) Connect peers into a closed p2p network (voters get the list of registered members from the blockchain):
		- VPN, bad user experience
		- ICE (TURN, STUN, ICE):
			1. libp2p, http://libp2p.io, may have not implemented all features
			2. IronFish, in-browser p2p crypto, https://ironfish.network/docs/whitepaper/2_networking
			3. TURN, https://github.com/pion/turn
			4. STUN, https://github.com/pion/stun
			5. ICE, https://github.com/pion/ice
	3. (hard) Run Distributed Key Generation ([[DKG]]) for elGamal on the babyJubJub curve
		1. Find some ready-to-use implementation, or
		2. (hard) Write our own implementation, inspire by
			- https://asecuritysite.com/kryptology/dkg
			- https://github.com/taurusgroup/multi-party-sig
			- https://github.com/taurusgroup/frost-ed25519
			   - https://github.com/ZcashFoundation/frost
			- https://github.com/TNO-MPC/protocols.distributed_keygen
	4. (easy) Write a procedure for calculating the lookup table of discrete log trapdoors.
		1. https://www.npmjs.com/package/babyjubjub
		2. https://github.com/iden3/circomlib/blob/feature/babypbk/src/babyjub.js
1. [[Round 2. Voting]]
	1. (easy) Write a procedure for generating an encrypted vote (ElGamal on babyJubJub)
		- https://github.com/iden3/ffjavascript
		- https://github.com/arkworks-rs
	2. (medium) Write a procedure for generating [[PoB - Proof of Ballot]] (Groth16 BN-254)
		- Use [circom](https://docs.circom.io) (less than 100 lines of a circuit)
		- Reuse some circuits from [MACI](https://github.com/privacy-scaling-explorations/maci/tree/master/circuits/circom)
	3. (easy) Write a procedure for submitting the vote to the blockchain.
2. [[Round 3. Tally]]
	1. (easy) Write a procedure for nodes to download all encrypted votes from the blockchain.
	2. (easy) Write a procedure for nodes to validate the [[PoB - Proof of Ballot|proofs of ballots]]
		 - https://github.com/iden3/snarkjs
	1. (easy) Write a procedure for nodes to calculate the sum of cyphertexts. Steps 1 and 2 from [[Round 3. Tally]]
	2. (medium) Write a procedure in which nodes jointly (in MPC) decrypt the votes and produce [[PoD - Proof of Decryption]]. Steps 3 and 4 from [[Round 3. Tally]]
	3. (easy) Write a procedure to extract the result solving discrete log using a pre-computed lookup table of trapdoors. Steps 5 and 6 from [[Round 3. Tally]]
	4. (easy) Publish the result along with proof, back to the blockchain.