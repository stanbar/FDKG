TODO:
- [ ] Unify the notation of ephemeral keys, voting keys, voter key pairs, and ephemeral keys, session keys etc.

Let $G$ denote a finite cyclic group of prime order q in which the decision Diffie-Hellman problem is infeasible. Let g be a generator in G. 

Assumptions:
- All communication is done over public [[Terminology#Message board|message board (blockchain)]].
- Authenticated public channels are available for every participant, achieved by a public message board and digital signatures.
- Each party $P_i$ consists of key pair $(sk_i, pk_i)$. Where the $sk_{i} \in_{R} \mathbb{Z}_q$ is a randomly selected secret key, and $pk_{i} = g^{sk_i}$ is the corresponding public-key.
- There are $n$ participants, and they all agree on $(G,g,n,(pk_i,\dots,pk_n))$.
- Public-key encryption is realised using elGamal cryptosystem. $E_{pk}(\cdot)$ is the ecnryption algorithm for public key $pk$, and $D_{sk}(\cdot)$ is the decryption algorithm using corresponding secret key $sk$.



Then, participants execute the following three-round protocol.

# Round 1. Distributed Key Generation

The goal of DKG protocol is to let parties $P_1,\dots,P_n$ jointly generate the random polynomial $f(X)$ where $f(0)=s$ is the voting secret key and $p = g^s$ is the voting public key. Public key $p$ is used to encrypt the votes, and secret key $s$ is used to decrypt the sum of the votes. Since the polyonomial is distributed across the parties, no single party can compute the $f(0)$ nor the decryption key $s$. It is done by having each party pick a random polynomial $h_{i}(X) \in \mathbb{Z}_q[X]$, and then defining the $f(X)=\sum_{i=1}^{n}h_i(X)$.


The DKG protocol involves each party $P_{i}\dots,P_n$:
- Sample random polynomial $h_{i}(X) \in_R \mathbb{Z}_q[X]$.
- Compute ephemeral secret key $esk_{i}= h_i(0)$ and ephemeral public key $epk_{i} = g^{esk_i}$.
- Compute zero-knowledge proof (ZKP) of exponent $epk_{i} = g^{esk_i}$ using Schnorr’s signature. Namely, the proof is $\sigma_i = (g^{v}, r=v-esk_{i}z)$, where $v\in_{R} \mathbb{Z}_q$ and $z=H(g, g^{v}, g^{esk_{i}}, i)$.
- Compute shares of ephemeral secret key $epks_i := \{ h_{i}(j) : j \in \{1\dots n\}/\{i\}\}$, and encrypt each share to each corresponding party using elGamal assymetric encryption $S := \{E_{p_{j}}(epks_{i}[j]) : j \in \{1\dots n\}/\{i\}\}$.
- Compute zero-knowledge proof of elGamal encryption as described in [verifable secret sharing (PVSS)]( https://www.win.tue.nl/~berry/papers/crypto99.pdf). Namely, ==TODO==.
- Broadcast tuple of public key, zkp, and all encrypted shares $(epk_{i}, \sigma_i, S)$ to message board.

The DKG phase is optional, the actual number of parties that participated is denoted by $m$ where the maximum number is $n$.

##### State after Round 1.

After the DKG has completed (once it reached $n$ messages or after some predefined period). The message board state looks as follows:
- $\{epk_{i} : 1 \leq i \leq m\}$, shares of voting public key.
- $\{\sigma_{i} : 1 \leq i \leq m\}$, proofs of exponents.
- $\{\{E_{p_{j}}(epks_{i}[j]) : 1 \leq j \leq m\} : 1 \leq i \leq m \}$, shares of sharing of voting secret key.


The public key $PK$ and share of secret key $SK_i$ can be reconstructed by each party $P_1,\dots,P_n$:
- Public key $PK=\Pi_{i=1}^{n} epk_{i} = \Pi_{i=1}^{n} g^{esk_i}=g^{\sum_{i=1}^{n} esk_i}$.
- Share of secret key $SK_{i}=\sum_{j=1}^{m} D_{sk_{i}}(esk_{ji})$.

# Round 2. Voting

##### One-candidate

The voting phase involves each party $P_{i}\dots,P_n$:
- Select a vote $v_{i} \in \{0,1\} \simeq \{\textrm{"no", "yes"}\}$.
- Compute a ballot using ElGamal encryption for $C_i = (A_i, B_i)=(k_iG, v_{i} H + k_i \cdot PK)$, where $k_{i} \in_{R} \mathbb{Z}_q$ is a blinding factor for user $i$, and $G$ and $H$ are public parameters. 
- Compute a $\Sigma$-proof that $(A_i,B_i)$ is correctly formed. ==TODO==.
- Broadcast $(C_i,\sigma_i)$.

##### Multiple candidates

Let $c_{1} \dots c_{l}$ be a set of all possible candidates.

The voting phase involves each party $P_{i}\dots,P_n$:
- Select a vote $v_{ij} \in \{0,1\} \simeq \{\textrm{"no", "yes"}\}$ for candidate $j \in \{1 \dots l\}$.
- Compute a ballot using ElGamal encryption for $C_i = (A_i, B_i)=(r_iG,\ r_i \cdot PK + v_{i1} H_1 + \dots + v_{il} H_l)$, where
	- $r_{i} \in_{R} \mathbb{Z}_q$ is a blinding factor for user $i$, and 
	- $G$ and $H_{1,}\dots, H_{l}$ are public parameters. 
- Compute a $\Sigma$-proof that $(A_i,B_i)$ is correctly formed. ==TODO==.
- Broadcast $(C_i,\sigma_i)$.

##### State after Round 2.

After the voting phase has completed (once it reached $n$ messages or after a predefined period). The message board state looks as follows:
- $\{(C_{i}, \sigma_i) : 1 \leq i \leq k\}$, set of encrypted votes casted by $k$ voters, along with ZKPs showing that $v_{ij}$ is one of $\{0,1\}$.

# Round 3. Decryption and Tally

The decryption and tally is achieved via $(t,m)$ Threshold ElGamal Decryption. 

The tallying phase involves each party $P_{i} \dots, P_m$:

- Compute the sum of cyphertext using ElGamal homomorphic property. Sum of the first part $A = \sum_{i=1}^k r_{i}G$. Sum of the second part $B=\sum_{i=1}^k a_{i}PK + v_{i1}H_{1}+\dots +v_{ik}H_{k}$.
- Compute 

- Each party $P_i$ takes $A$ and its share $SK_i$ to produce $d_i=A^{SK_i}$ along with a $\Sigma$-proof showing that $log_{g}PK_{i}=log_{A}(d_i)$ holds.
- Let Q be a set of $t+1$ parties who produced valid $d_i$ values. Then the plaintext M can be recovered by first evaluating $A^{SK}=\prod_{i=1}^{t+1} d_i^{\prod_{j=1}^{t} \frac{j}{j-i}}$, $i\neq j$ , and then computing $M=B/A^{x}$. 

#### State after Round 3.

