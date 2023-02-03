- Decide on what part of the computation can be done off-chain and what needs to be done on-chain?
- Decide on which blockchain to use:
	- Stellar (trust-based consensus, experience, wasm in beta)
	- Ethereum (experience, a lot of zkp tooling, easy to develop, evm)
- Write down a formal description of the [[Protocol]].
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
			2. TURN, https://github.com/pion/turn
			3. STUN, https://github.com/pion/stun
			4. ICE, https://github.com/pion/ice
	3. (medium) Run Distributed Key Generation ([[DKG]]) for elGamal on the babyJubJub curve
		1. Find some ready-to-use implementation, or
		2. (Lev?) Write our own implementation, inspire by
			- https://asecuritysite.com/kryptology/dkg
			- https://github.com/taurusgroup/multi-party-sig
			- https://github.com/taurusgroup/frost-ed25519
			- https://github.com/TNO-MPC/protocols.distributed_keygen
	4. (medium) Write a procedure for calculating the lookup table of discrete log trapdoors
2. [[Round 2. Voting]]
	1. (Lev?) Write a procedure for generating an encrypted vote (ElGamal on babyJubJub)
		- (Lev?) Do you know some ready-to-use solutions?
	2. (Lev?) Write a procedure for generating [[PoB - Proof of Ballot]] (Groth16 BN-254)
		- Use [circom](https://docs.circom.io)
		- Reuse some circuits from [MACI](https://github.com/privacy-scaling-explorations/maci/tree/master/circuits/circom)
	4. (easy) Write a procedure for submitting the vote to the blockchain.
		- (easy) Blockchain dependent.
1. [[Round 3. Tally]]
	1. (Lev?) Write a procedure for nodes agreeing on a certain state of the votes on the blockchain.
		- It could be executed on-chain using SC.
	2. (Lev?) Write a procedure for nodes to download all encrypted votes from the blockchain.
		- It could be executed on-chain using SC.
	3. (Lev?) Write a procedure for nodes to validate the [[PoB - Proof of Ballot|proofs of ballots]].
		- It could be executed on-chain using SC.
	4. (Lev?) Write a procedure for nodes to calculate the sum of cyphertexts. Steps 1 and 2 from [[Round 3. Tally]]
		- It could be executed on-chain using SC.
	5. (Lev?) Write a procedure in which nodes jointly (in MPC) decrypt the votes. Steps 3 and 4 from Round 3. Tally
	6. (Lev?) Write a procedure to compute a discrete log using a pre-computed lookup table of trapdoors. Steps 5 and 6 from [[Round 3. Tally]]
	7. (Lev?, optional) Write a procedure for producing a [[PoD - Proof of Decryption]], or threshold signature (using the shared private key) on the computed result. Steps 5 and 6 from [[Round 3. Tally]]
	8. (easy) Publish the result along with proof, back to the blockchain.
		- (easy) Blockchain dependent.