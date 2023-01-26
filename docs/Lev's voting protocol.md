ElGamal encryption/decryption

$M$ - cleartext
$p$ - server private key
$P = pG$ - server public key

Encryption:
$(C = M + kP; K = kG)$, where $k$ is a random value.

Decryption:
$M = C - pK$

ElGamal encryption is basically message M shifted by a key derived using DHKE, where a public key is provided along the ciphertext.

pK = kP

---

0 : 0
1: G
2: 2G
3: 3G
...
n: nG

sort by (x,_) of G

# Soukhanov-Baranski voting protocol


Algorithm:
-  precompute: $G, 2G, ... nG$ , where $n$ is the number of voters.
- $M_i = (G + kP, K)\ or\ (kP, K)$, transaction for voter $i$, for voting yes or voting no. Only one vote per voter.

---

Multiple candidates:

Use multiple generators:
each for candidate — a lot of precomputation, bad idea. We would need to precompute all possible states of result
n - 1M
n^2 = a lot

Send multiple points:
multiple elGamal encryptions, 
c - number of candidates
c paris of (G + kP, K) or (kP, K)

vote: [1: (kP, K), 2: (G + kP, K), 3: (kP, K)]
We prove that our proof is correct by showing that $\sum votes = 1$ and every vote is 0 or 1.
Use Groth16 or Bulletproof-style argument
We need to prove that we send only one 1.

SNARK is used by client to prove that the vote is correctly.
In MACI they use Groth16 or PlonK likely.

EVM has support for Groth16 proof verification.

If I use groth16 I should use babyJubJub
If I use Bulletproofs I should babyJubJub
or secp255k1

ecrecover <--- allow to efficiently verify ecdsa signature of

secp256k1 by tricking evm into thinking it verifies public key.

But the best option to use groth16.

---

(and a proof that they've voted correctly)

Proof that they know k and M_i is one of those two forms

we accumulate votes to 

$accVotes = \sum \delta_{i} G+k_{i}P$ , where $\delta_{i}$ is either 0 or 1, and $i$ is the index of a voter.
$accKeys = \sum_{i} K_{i}$

$[batchDecryptor] = [p] accKeys$. <- the only part that needs to be done inside MPC, its the beauty if it. 
batchDecryptor is a sum of all shared keys we need to substract from the result.

It may be usefull to prove in some way that how do i say it... mmm... 
We should prove that the batchDecriptor is proportional to $K$.

And G is proportional to P and K is proportional to batchDecriptor, with the same coefficient (p).

Proof: $\pi$  - there is $p$ which $pG = P$ and $pK = batchDecriptor$.

MPC should output this proof. how? 

It's shared over elliptic curve. To decrypt it, we need to open it.

$result * G = accVotes - batchDecryptor$

Now we need to caluclated discrete logarithm of $result*G$. Iterate over table of precomputed values. Lookup table. Bruteforce discrete logaritm. But it take logarithmic time, because we use precomputed table — fast. Use binary search.

But the result is small, between 0 and n, and we have it precomputed in the first step.

$0 <= result <= n$

Output of scheme would be (set of transactions, batchDecryptor (can be recovered, but may be included), $\pi$, and result)

---
#### How to create $\pi$

It's proof but it's not a standard SNARK.

Four points: A B C D

DH quadruple

I want to prove "i know p that pA = B and pC  = D"
(A,C) proportional to (B,D)

Assume A and C are independent, because there were e.g. created by hashing some value. 
sample random coefficient using Fiat shamir: hash(), used in most zkProofs, DSA 
pseudo-random coefficient $\lambda = hash(ABCD)$

pick $A + \lambda C$ and prove that it's proportional to $B + \lambda D$ using Schnorr proof (DSA)
Statement: for random $\lambda$ we can not 

---

Concretely:

A = G
B = P
C = accKeys
D = batchDecryptor

Is C independent from A? 
We don't know, but if not we can fix it with a bit more involved protocol.

---

TODO:
- [ ] Understand why it works if A and C are independent.


---

Involved version

Sample random point $Z$ on curve - z = hash(A**BCD**), 

// WRONG: Z = zG, it does not work because we leak the dicrete logarithm

(x,\_) = hash(A**BCD**)
find (\_,y) which satisfy the equation. 
If we don't find it, increment x by 1.

Z = toCurve(hash(ABCD))

Why: [[On EC we have only half chance to find a point]]

Prover should provide another point T by multiplying by p, i.e., T = pZ 

Sample two scalars:
$\lambda = Hash(A, B, C, D, T, 1)$
$\mu = Hash(A, B, C, D, T, 2)$

Two points on curve:
$A+\lambda B + \mu Z$
$C + \lambda D + \mu T$

Then we publish Schnorr's proof of this proportionality, this pair $(A+\lambda B + \mu Z, C + \lambda D + \mu T)$

Easy to do in MPC.

Sampling Z is public, because it's hashing of public values (ABCD).
Produce T, it involves, multiplying private key p by value Z and reveal it (same as with batchDecryptor).

Doing Schnorr in MPC is hashing of public values and multiplying public values by private value, and multiplying by random value. Random value can be precomputed and therefore may be public parameter.

This proof is much easier than Groth16.

There may be easier proofs, in the literature.

---

Paillier cryptosystem, additively homomorphic, is hard in MPC.

But we can overcome it by using the lookup table, since it's not that big.

Normally people use the Paillier cryptosystem homomorphic trapdoor decryption. But does not work well in MPC. It's a complicated scheme.

ElGamal is homomorphic over EC.
Paillier is homomorphic over scalars.
Paillier we encrypt the same as RSA.
Paillier decryption is done using trapdoor.
Trapdoor, allows for solving discrete logarithm problem.

For a few parties they use Paillier. We have many parties so we need something different/simplier.

---


t - threshold

N - number of parties

t - privacy treshold

then N-t - liveness treshold

and it is maliciously secure with 0 of N trust :)))

aka auditable


communication complexity: 2 elliptic curve points per binary option


1 groth16 proof client-side.


- [ ] What about co-SNARK? The co-SNARK is needed to create [[#How to create $ pi$]].
- [ ] What HashToCurve should I use? SHA512 mod p.
- [ ] Look at standard Schnorr signature implementation.
- [ ] HashToCurve https://datatracker.ietf.org/doc/draft-irtf-cfrg-hash-to-curve/



---

##### zkSNARK on client side

If the vote is 1 or 0 we don't need general zkSNARK. We need some kind of proof.
Vote is: (kP+(0/1)G, kG)
verifier/sample: t

C + t K ----- I want to prove that it is either proportional to P + tG
or C+tK-G is proportional to P+tG

Ring signatures (RS) in essence:
Tehcniqie whcich allows to prove, we know pk of A or pk of B.
RS for (A, A-H) is proof that I know pk of A or pk of A-H.

You prove that you know $t$ such that either: A = tG, A = tG+H

In our case H is vote for 1 or 0.

---
##### How Monero works

They use RS for range proof.
tG + vH

- t is blinding factor (random value to obfuscate v), Pedersen commitment.
- v is a value

we want to hide v. Where v is value of transaction in Monero.
then they need to prove 0 <= v <= 2^64

G and H must be independent (e.g. we chose G randomly and H is pseudorandom using HashToCuve, because otherwise we could break scheme by swaping v on the fly)

In Halo, or Bulletproofs we reason in Pedersen commitments.

Vector Pedersen commitment: rG + a_1 H_1 + ... + a_n H_n
a = (a_1, ..., a_n) - vector we want to commit to


---

##### What is the relation between Range proofs and ring signatures

Range proof can be done using ring signatures, but it is slow, because we need one RS per bit.
Bulletproofs are faster $\log (|a|)$

- [ ] Decide if we need RS or bulletproof for range proof. Possible RS are better if we need just 0/1.

---


##### Multiple candidates

Per candidate: $A_i = a_i G + v_i H$
we have to prove that $v_i$ is either 0 or 1

Per whole vote: and for A = \sum A_i sum of v_i is 0 or 1 , so we didn't vote for multiple candidates

Range proofs are neccessary because overflows, negative numbers etc.

##### Suppose 2 candidates

A = aG + v_1 H_1 + v_2 H_2
- a is blinding factor
- v_1 is vote for 1 candidate
- v_2 is vote for 2 candidate

As a result we will have: (total sum for 1st candidate) H_1 + (total sum for 2nd candidate)H_2

Lookup table would be N^2, where N is total possible number of votes. For 1000 voters we get table of size 1M, after that it get's much harder.


### Client side proof: As part of a transaction, Non interactinve proof

#### Lev's Shnoor singtures
The size is of two shnoor singtures

We send elGamal encryption:
$c=(kP+vH, K=kG)$
- we need to create a proof \pi that $v = 0\ or\ 1$.

##### Proof of \pi that v = 0 or 1

(C = kP + vH, K=kG) 

1) sample t = Hash(C, K) | and sample Z = HashToCurve(C, K) | provide Z' = kZ
2) denote B = C + tK, A = P + tG | B = C+tK+Z' | A = P+tG+Z
3) give ring signature or-proof for a pair (B, B-H) wrt to generator A

If someone learns total sk then they can break the voting by (feed system with undecryptable votes, which would prevent decrypt the voting).


---
##### Simpler version without Z

What is B?
- B is kP + vH + tK = k(P+tG) + vH = kA + vH
- C-vh $\~_k$ P
- ~_k - is proportional to with coeff k

(A, B) ~ (C, D)
A+tC ~ B+tD

But since we don't know whether they are independend we need Z.

##### Harder version with Z

Z' = kZ
t' <--- Hash(..., Z')
A + tB + t'Z ~ C + tD + t' Z'

#### Then we need RS

(C, K), Z', and a ring signature of length 2
so 3 points + 2 Schnorr sigs

This needs to be done for each candidate and total sum.

Size of pi = 192 bytes per candidate
for 5 candidates ~ 1kB proof

#### Alternative just posting el Gamal encryption + Groth16 proof

Additional advantage is that the work is already done for us

https://github.com/privacy-scaling-explorations/maci/blob/master/circuits/circom/ecdh.circom

https://github.com/privacy-scaling-explorations/maci/tree/master/circuits/circom

Compiles to snarkJS. snarkJS will generate prover and verifier.

It may be a bit smaller compared to naive way. 64bytes / candidate + Groth16 proof.

It would be simpler to implement groth, because we don't have to use.

ElGamal on babyJubJub + Groth16 BLS-254

---

Comparing to 
"OVN: A Smart Contract for Boardroom Voting with Maximum Voter Privacy":

2 rounds:
1. They create Pedensen commit to vote
2. We vote
If anybody declines we can not decrypt.

Their strengths:
- it's completely on-chain, no additional infrastracture needed, on chain verifability.
- unconditional privacy

Their weaknesses
- everyone can dos the whole vote
- from the theoretic security it means it is n-of-n trust with 1-of-n liveness


They are 2 rounds, we are 3 rounds.

3 rounds
1. SETUP: Shamir's secret shared pubkey P (DKG) HARD PART, use out of the box solution. All shares of public keys are published on chain.
2. VOTING: Everybody sends their ElGamals and proofs.
3. DECRYPTING & COUNTING: 
	1. We add up all the stuff, obtain $C = \sum S_i$ and $K = \sum K_i$  
	2. Now everybody sends p_i K (and a proof of proportionality, suggest signature of this pair (p_i K+tP_i) ~ K+tG), this is not SNARK, it's Shnoor's signature.

Dumb version n-of-n SSS pk is sum of shares. The setup is trivial. Everybody publish everything. If someone declines, then everythig is broken. Less efficient than OVN because of elGamal, SSS, we have 2 instead of 3 rounds. But in practice it's the same. It's self-tallying. The last folk sending the message can break everything if they do not like the result (kind of solved by commit-reveal). They don't need DKG because n-of-n. Really bad because one person can break the voting.

Better k-of-n SSS (where k < n, where k=xn, x ~0.9, much better). The same but DKG. 
- NAIVE WAY of DKG on-chain: Everyone E_1, ..., E_n? Everyone creates the polynomial, and sends shares to other players, add the other stuff, and obtains p_i K.
- BETTER WAY of DKG off-chain: https://en.wikipedia.org/wiki/Publicly_Verifiable_Secret_Sharing#Chaum-Pedersen_Protocol 


BC does not need to be public. We just need a way of public. We can deply distributed network
- need to be able to sustain exactly 3 blocks.
- consensus
- send transactions

- SSS off chain.
- Use public blockchain first, but in pluggable way, then we can replace it with private one.
- We don't need EVM compat, it's just bunch of equations to verify SNARKs.
- docs.circom.io better than Cairo. Circoim (optimal for Groth16) better for small things.


Circom only.
Hard part is networking and SSS.


Our weaknesses:
- Synchronious protocol using MPC
- Conditional privacy (honest majority assumption)


and it's their advantage, is that they don't require MPC. It's just a smart contract execution.

What do we need to reserach?
- How to do DKG
What are the challenges (what we don't know)?
- 
What are the possible solutions?
What are the steps?
	We need some sort of setup phase for Shamir's secret sharing of decryption key, indeed
What software do we need to create?
What can we reuse?

Do we need blockchain?
