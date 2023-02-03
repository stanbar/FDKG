- Write down a formal description of the protocol.
- Decide on which blockchain to use
	- Stellar (trust-based consensus, experience, wasm in beta)
	- Ethereum (experience, a lot of zkp tooling, easy to develop, evm)
- Development roadmap:
1. Setup: 
	1. (hard) Bootstrapping voting:
		1. Write a procedure for bootstrapping voting.
			1. Host of the voting creates a list of public keys and candidates.
			2. The list of candidates and members (come smart encoding) is encoded as a QR code.
			3. The QR code is broadcasted (for example on a presentation's slide, on a website, or via emails)
			4. Members can scan the QR code, validate the voting, and join
	3. (hard) Connect peers into a p2p network:
		- VPN, bad user experience
		- (hard) ICE (TURN, STUN, ICE):
			1. libp2p, http://libp2p.io, may have not implemented all features
			2. TURN, https://github.com/pion/turn
			3. STUN, https://github.com/pion/stun
			4. ICE, https://github.com/pion/ice
	4. (Lev?) Run Distributed Key Generation for elGamal on the babyJubJub curve
		1. Find some ready-to-use implementation, or
		2. (Lev?) Write our own implementation, inspire by
			- https://github.com/taurusgroup/frost-ed25519
			- https://github.com/TNO-MPC/protocols.distributed_keygen
	1. (Lev?) Write a procedure for calculating the lookup table of discrete log trapdoors
2. Voting:
	1. (Lev?) Write a procedure for generating an encrypted vote (ElGamal on babyJubJub)
		- (Lev?) Do you know some ready-to-use solution?
	2. (Lev?) Write a procedure for generating proof of ballot (Groth16 BN-254)
		- [MACI](https://github.com/privacy-scaling-explorations/maci/tree/master/circuits/circom)
	3. (easy) Write a procedure for submitting the vote to the blockchain:
		- (easy) Submission to blockchain
3. Tally:
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
	8. (Lev?) Publish the result along with proof, back to the blockchain.
		- (easy) Submission to Blockchain