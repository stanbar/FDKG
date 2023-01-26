In essence, we need to prove that the vote value is 1 or 0.

If the vote is 1 or 0 we don't need general zkSNARK. We need some kind of proof.

For multiple candidates the proof looks as follows:
Let's assume 2 candidates.
Ballot looks as follows:  $A_i = a_iG + x_1 H_1 + x_2 H_2$
- $a$ is blinding factor;
- $x_1$ is vote for 1 candidate;
- $x_2$ is vote for 2 candidate;

We have to prove that:
- $\bigwedge_{i\dots n} x_i = 1 \lor x_{i} = 0$, only yes ($1$) or no (0).
- $\sum_{i \dots n} x_{i} = 1$, only one yes ($1$) selected, we don't want to allow voting for multiple candidates for now.

Range proofs are neccessary to prevent overflows, negative numbers which may sum to 1 or 0.

For constructing proof of ballot's correctness we can use:
2) [[#Specific Range proofs]] using [[Ring Signature]] or Bulletproof-style argument.
1) [[#Genral zkSNARK]] using Groth16

# Specific Range proofs
#### Lev's Shnoor singtures
The size is of two shnoor singtures

We send elGamal encryption:
$c=(kP+vH, K=kG)$
- we need to create a proof \pi that $v = 0\ or\ 1$.

#### Proof of $\pi$ that v = 0 or 1

(C = kP + vH, K=kG) 

1) sample t = Hash(C, K) | and sample Z = HashToCurve(C, K) | provide Z' = kZ
2) denote B = C + tK, A = P + tG | B = C+tK+Z' | A = P+tG+Z
3) give [[Ring Signature]] or proof for a pair (B, B-H) wrt to generator A.

If someone learns total sk then they can break the voting by (feed system with undecryptable votes, which would prevent decrypt the voting).

#### Then we need RS

(C, K), Z', and a ring signature of length 2
so 3 points + 2 Schnorr sigs

This needs to be done for each candidate and total sum.

Size of pi = 192 bytes per candidate
for 5 candidates ~ 1kB proof

# Genral zkSNARK

The biggest advantage is that the work is already done for us

https://github.com/privacy-scaling-explorations/maci/blob/master/circuits/circom/ecdh.circom

https://github.com/privacy-scaling-explorations/maci/tree/master/circuits/circom

Compiles to snarkJS. snarkJS will generate prover and verifier.

It may be a bit smaller compared to naive way. 64bytes / candidate + Groth16 proof.

It would be simpler to implement groth, because we don't have to use.

ElGamal on babyJubJub + Groth16 BLS-254
