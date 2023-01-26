In essence, everybody sends $p_i K$ (and a proof of proportionality, suggest signature of this pair $(p_i K+tP_i)\ \mathrm{propto}\ (K+tG)$, this is not SNARK, it's Shnoor's signature.

We should prove that the batchDecriptor is proportional to $K$.

And G is proportional to P and K is proportional to batchDecriptor, with the same coefficient (p).

Proof: $\pi$  - there is p which pG = P and pK = batchDecriptor.

It's shared over elliptic curve. To decrypt it, we need to open it.

$result * G = accVotes - batchDecryptor$

Now we need to caluclated discrete logarithm of $result*G$. Iterate over table of precomputed values. Lookup table. Bruteforce discrete logaritm. But it take logarithmic time, because we use precomputed table — fast. Use binary search.

But the result is small, between 0 and n, and we have it precomputed in the first step.

$0 <= result <= n$

Output of scheme would be (set of transactions, batchDecryptor (can be recovered, but may be included), $\pi$, and result)

##### Proof of proportionality

Four points: A B C D

I want to prove "i know $p$ that $pA = B$ and $pC  = D$"

Assume A and C are independent, because there were e.g. created by hashing some value. 

Sample random coefficient using Fiat shamir: hash(), used in most zkProofs, DSA 

Pseudo-random coefficient $\lambda = hash(ABCD)$

Pick $A + \lambda C$ and prove that it's proportional to $B + \lambda D$ using Schnorr proof (DSA)

Statement: for random $\lambda$ we can not 

In our case 

A = G
B = P
C = accKeys
D = batchDecryptor

#### Involved version

Is C independent from A? 
We don't know, but if not we can fix it with a bit more involved protocol.

Sample random point $Z$ on curve. z = hash(A**BCD**), 

// WRONG: Z = zG, it does not work because we leak the dicrete logarithm

(x,\_) = hash(A**BCD**)
find (\_,y) which satisfy the equation. 
If we don't find it, increment x by 1.

Z = toCurve(hash(ABCD))

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

However there may be easier proofs, in the literature.