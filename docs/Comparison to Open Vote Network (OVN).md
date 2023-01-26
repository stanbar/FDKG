# OVN

OVN is 2-round voting protocol with self-tallying:
-   1. Voters create Pedersen commitments to vote
-   2. Voters send votes

Problems:
- Everyone can dos the whole vote, from the theoretic security it means it is n-of-n trust with 1-of-n liveness.
- It is based on Ethereum blockchain, not non-technical users friendly (not a big issue as it can be run on private PoA Ethereum network).

# Our solution

Instead of impractical n-of-n trust we use k-of-n SSS (where k < n, k=xn, x ~0.9). It requires a 3-round voting protocol:

Protocol:
-   1.  SETUP: Shamir's secret shared pubkey P (DKG) HARD PART, use out of the box solution. All shares of public keys are published on-chain.
-   2. VOTING: Everybody sends their ElGamals and proofs.
-   3. DECRYPTING & COUNTING:
    - 1. We add up all the stuff and obtain  $C = \sum S_i$, and $K = \sum K_i$ .
    - 2. Now everybody sends its $p_iK$ (and a proof of proportionality, suggest signature of this pair $(p_i K + tP_i)\ \mathrm{propto}\ (K+tG)$, simple Schnorr's signature. 