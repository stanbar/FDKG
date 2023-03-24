#### Achievements
1. We have specified our use-case — small-scale, boardroom, housing communities elections.
2. We've set goals for the protocol:
	1. voter-2-voter setting, no trusted authorities
	2. optional participation
	3. In asynchronous protocol, participants do not need to be online at any time, they can show up, send a message, and leave.
	4. blockchain agnostic, we use blockchain for a message board—common knowledge of registered votes.
3. We've designed a [[Federated Protocol]]
4. We've planned the [[Development]]

Unresolved issues:
- We know how to achieve synchronous (each party has to reshare each time a new one participates) dynamic KeyGen, but
- We don't know how to achieve dynamic async (each party speaks only once (YOSO)) KeyGen.
- In-browser full-node, [possible, but hard](https://forum.polkadot.network/t/full-node-in-browser/2185).

We designed the protocol using:
- DKG using PVSS
- Threshold decryption using Threshold ElGamal Encryption
- Multi-candidate using 