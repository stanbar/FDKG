### Distributed Encryption Key Generation

Once the network is established nodes execute the first MPC functionality $F_1$, which lets nodes jointly compute $\textrm{PK} \equiv \textrm{SK} * g$, without reconstructing $\textrm{SK}$ on any single device. This is achieved using Shamir Secret Sharing (SSS) or Distributed Key Generation (DKG) schemes [@gennaroSecureDistributedKey2007; @boldyrevaThresholdSignaturesMultisignatures2003].

Symbolically, the functionality $F_1$ is defined as follows: $$F_1(\mathrm{SK}_1, ..., \mathrm{SK}_N) = DerivePubKey(DKG(\mathrm{SK}_1, ..., \mathrm{SK}_N)) \rightarrow PK$$

![Setup phase of the proposed i-voting system.](setup.png){#fig:setup}

The reconstruction of a $\textrm{SK}$ is possible only if a sufficient number of votes (predefined threshold) collude. It would require executing malicious functionality $F_m(\mathrm{SK}_1, ..., \mathrm{SK}_N)=DerivePrivKey(\mathrm{SK}_1, ..., \mathrm{SK}_N) \rightarrow \textrm{SK}$. The situation should not happen under the honest majority assumption. 

# Building blocks

The following schemes are from [Lecture Notes Cryptographic Protocols page 75](https://www.win.tue.nl/~berry/2WC13/LectureNotes.pdf)

### ElGamal Threshold Cryptosystem

ElGamal Threshold Cryptosystem (t,n) over an Elliptic Curve $E_p$, $p$ being a large prime, with the following parameters:
- $G$ is a generator point of $E_p$ with order $q$.
- A dealer chooses a polynomial $f(X)=sk+a_{1}X + \dots + a_{t - 1}X \in Z_q[X]$ where $sk \in Z_q$ is the secret key of the cryptosystem.
- $PK=sk \cdot G$ is the public key.
- The dealer computes and distributes the secret private shares $sk_{i}$ to $P_i$ as $f(i)$, $i \in 1,\dots,n$.
- The secret key can be reconstructed using any $t\leq n$ shares $f(1), \dots, f(t)$, because $sk=\sum_{i=1}^{t} f(i) \prod_{j=1}^{t} \frac{j}{j-i}$, $i\neq j$ .

However, this scheme is not sufficient, we don't want any single party to generate the private key. We want the private key to be joinly generated in such a way that parties learn only shares of the private key. 

### Distributed Key Generation

The goal of DKG protocol is to let parties $P_1, P_2,...,P_m$ jointly generate the random polynomial $f(X)$. It is done by having each party pick a random polynomial $g_{i}(X)\in Z_q[X]$, and then defining the $f(X)=\sum_{i=1}^{m}g_i(X)$. 
The DKG protocol consist of the following steps:
- Each party $P_i$, samples generate random polynomial $g_{i}(X)\in Z_q[X]$
- Each party $P_i$ broadcast its public key $g^{sk_i}$, where $sk_i=g_i(0)$, the join public key becomes $PK=\Pi_{i=1}^{m} g^{sk_i}=g^{\sum_{i=1}^{m} sk_i}$ 
- Each party $P_i$ broadcast share of secret key $sk_{ij}=g_i(j)$ for each other party $P_j$, where $1 \leq i,j \leq n$. 


### Threshold ElGamal Decryption

Let C = $(A = kG; B = M + k \cdot PK)$  be an ElGamal ciphertext for public key $PK$. 
- Each party $P_i$ takes $A$ and its share $SK_i$ to produce $d_i=A^{SK_i}$ along with a $\Sigma$-proof showing that $log_{g}PK_{i}=log_{A}(d_i)$ holds.
- Let Q be a set of $t+1$ parties who produced valid $d_i$ values. Then the plaintext M can be recovered by first evaluating $A^{x}=\prod_{i=1}^{t+1} d_i^{\prod_{j=1}^{t} \frac{j}{j-i}}$, $i\neq j$ , and then computing $M=B/A^{x}$. 

### Dynamic Threshold ElGamal

Dynamic version of Distributed Key Generation allows for unknown number of participants. Namely, the number of parties that participate in DKG is bounded, but unknown. The list of public keys of each party is known, but we don’t know who will participate and who won't. So the number can be in the range 1…N (where N is the total number of parties). 

We want the protocol to be three rounds, one message per round:

Round 1. m of n parties participate in DKG, where n is the known maximum number of participants, and m is the actual number of participants, unknown at the time a party sends a message. The public and (shared) secret keys are the result of all the submitted messages.

Round 2. All n voters (not only those that participated in the first round) can submit the encrypted message.

Round 3. Some subset of parties that participated in round 1, (say 0.6 of m), can decrypt the homomorphic sum of the encrypted messages.

We don’t know how many people show up in round 1, thus we want it to be dynamic. Then we don’t know how many people show up in round 3; but, we assume that at least some subset (say 0.6 of m) will. That’s why we need the threshold property of the decryption scheme.

Still not sure how to do it.