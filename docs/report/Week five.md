Name: Stanislaw Baranski
Date: 24.02.2023

# Results
%%Insert a summary of the results obtained from the research%%
This week we:
- Researched the Blockchain platform. Decided to use Stellar Soroban
	- Funding https://stellar.org/blog/a-developers-guide-to-soroban-adoption-fund-programs
	- Support for WASM/Rust
	- Federated BFT, Very cheap
- Researched dynamic threshold distributed encryption.
	- We are discussing the issue with prof. Berry Schoenmakers
	- https://www.win.tue.nl/~berry/papers/crypto99.pdf
	- https://ieeexplore.ieee.org/document/9261914
	- https://eprint.iacr.org/2021/1397
	- https://github.com/shaih/cpp-lwevss

# Challenges

We want the protocol to be three rounds, one message per round:

Round 1. m of n parties participate in DKG, where n is the known maximum number of participants, and m is the actual number of participants, unknown at the time a party sends a message. The public and (shared) secret keys are the result of all the submitted messages.

Round 2. All n voters (not only those that participated in the first round) can submit the encrypted message.

Round 3. Some subset of parties that participated in round 1, (say 0.6 of m), can decrypt the homomorphic sum of the encrypted messages.

We don’t know how many people show up in round 1, thus we want it to be dynamic. Then we don’t know how many people show up in round 3; but, we assume that at least some subset (say 0.6 of m) will. That’s why we need the threshold property of the decryption scheme.

Still not sure how to do it.

# Resources

Docs: [delendum-xyz/private-voting](https://github.com/delendum-xyz/private-voting/tree/main/docs)