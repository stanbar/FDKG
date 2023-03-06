Assumptions:
- All communication is done over public [[Terminology#Message board|message board (blockchain)]].
- Authenticated public channels are available for every participant, achieved by a public message board and digital signatures.
- The set of all $n$ participants $P_i,\dots,P_n$ is publicly known. 
- Each party $P_i$ consists of key pair $(s_i, P_i)$, where $s_{i} \in_{R} \mathbb{Z}_q$ is a randomly selected secret key, and $P_{i} = s_i \times G$ is the corresponding public-key. We use the same notation for party and public key, $P_i$, as parties are identified by their public keys only.
- We use [[Elliptic Curve Cryptography]], specifically [babyJubJub curve](https://z.cash/technology/jubjub/).
- Participation in the protocol is equivalent to agreeing to:
	- Elliptic Cuve $E(Z_q)$; 
	- Base (generator) point on curve $G$;
	- set of voters (participants) $\vec{P} = P_i,\dots,P_n$, where $n$ is the number of all voters;
	- candidate options $C_1, \dots, C_c$, where $c$ is the number of all candidates.
- Public-key encryption is realised using [[ElGamal]]cryptosystem. $EG_{P}(\cdot)$ is the ecnryption algorithm for public key $P$, and $EG_{s}(\cdot)$ is the decryption algorithm using corresponding secret key $s$.


# Round 1. Distributed Key Generation

#### Secret Sharing
The goal of DKG protocol is to jointly generate key-pair without any party learning the secret key. Each party $P_1,\dots,P_n$ learns only its share of the secret key, while public key is publicly known.
Sharing a secret can be done using Shamir Secret Sharing (SSS), which allows a dealer to encode secret key $s$ into a random polynomial $f(X) = a_0 + a_1X + a_2X^2 + \dots + a_{t-1}X^{t-1}$, where $a_0,a_1,\dots,a_{t-1} \in_R \mathbb{F}_q$; the secret key $s=a_0$ and $t-1$ is the degree of polynomial. Following a Lagrage Theorem, $t$ number of points on the polynomial $f(X)$ allows for reconstructing the polynomial and hence extract secret key by computing $s = f(0)$. The shares are distributed to parties $P_i, 1 \leq i \leq n$, by evaluating function at a corresponding point $f(i)$. The polynomial of degree $t$ can be reconstructed with $t+1$ points using Lagrange Interpolation.

#### Distributed Key Generation
Since we don't want any party to become a dealer (and learn the secret key), we have to distribute the generation of polynomial $\mathbf{f}(X) \in_R \mathbb{Z}_q[X]$ across parties. It is done by having each party pick a random polynomial $f_{i}(X) \in \mathbb{Z}_q[X]$, and then define the $\mathbf{f}(X)=\sum_{i=1}^{n}f_i(X)$; hence the voting decryption (secret) key $\mathbf{d}=\mathbf{f}(0)$, and voting encryption (public) key $\mathbf{E}=\mathbf{d}\times G$. Additionally, to prevent misbehavior of parties (sending arbitrary values) we use more sophisticated version of SS called Publicly Verifable Secret Sharing ([PVSS](https://www.win.tue.nl/~berry/papers/crypto99.pdf)) which involves zero-knowledge proofs attesting that the correct relation between values holds.

Every party can (but does not have to) participate in the DKG phase. The actual number of parties that participated is denoted by $m$ where the maximum number is $n$.

The DKG protocol involves each party $P_{i}\dots,P_m$:
- Sample random polynomial $f_{i}(X) \in_R \mathbb{Z}_q[X]$.
- Compute decryption (secret) key $d_{i}= f_i(0)$ and encryption (public) key $E_{i} = d_i \times G$.
- Compute zero-knowledge proof (ZKP) of exponent $D_{i} = d_i \times G$ using Schnorr’s signature. Namely, the proof is $\sigma_i = (r \times G, k=r-d_{i} \times c)$, where $r \in_{R} \mathbb{Z}_q$ and $c=H(G, i, r \times G, d_i \times G)$.
- Compute shares of decryption key $\vec d_i := \{ f_{i}(j) : j \in \{1\dots n\}/\{i\}\}$, and encrypt each share to each corresponding party $\vec{EG_{\vec{P}}(\vec{d_i})} := \{EG_{P_{j}}(\vec{d}_{i}[j]) : j \in \{1\dots n\}/\{i\}\}$.
- Compute zero-knowledge proof of elGamal encryption as described in [verifable secret sharing (PVSS)]( https://www.win.tue.nl/~berry/papers/crypto99.pdf). Namely, ==TODO==.
- Broadcast tuple of public key, zkp, and all encrypted shares $(E_{i}, \sigma_i, \vec{EG_{\vec{P}}(\vec{d_i})})$ to message board.

##### State after Round 1.

After the DKG has completed (once it reached $n$ messages or after some predefined period). The message board state looks as follows:
- $\{E_{i} : 1 \leq i \leq m\}$, shares of voting public key.
- $\{\sigma_{i} : 1 \leq i \leq m\}$, proofs of exponents.
- $\{\{EG_{P_{j}}(\vec{d}_{i}[j]) : j \in \{1\dots n\}/\{i\}\} : 1 \leq i \leq m \}$, encrypted shares of shares of voting secret key.

The voting encryption key $\textbf{E}$ can be reconstructed by everyone by computing $\mathbf{E}=\sum_{i=1}^{n} E_{i}$.

The share of voting decryption key $\mathbf{D_i}$ can be reconstructed by party $P_i$ by computing $\mathbf{D}_{i}=\sum_{j=1}^{m} EG_{s_{i}}(d_{ji})$.

# Round 2. Voting

Every party can (but does not have to) participate in the voting phase. The actual number of parties that participated is denoted by $k$ where the maximum number is $n$.

##### One-candidate

The voting phase involves each party $P_{i}\dots,P_k$:
- Select a vote $v_{i} \in \{0,1\} \simeq \{\textrm{"no", "yes"}\}$.
- Create an encrypted ballot $B_i$ using [[ElGamal]] encryption. $B_i =(k_i \times G, v_{i} \times H + k_i \cdot \mathbf{E})$, where $k_{i} \in_{R} \mathbb{Z}_q$ is a blinding factor for user $i$, and $G$ and $H$ are public parameters. 
- Compute a $\Sigma$-proof $\sigma_i$ that $B_i$ is correctly formed, namely, $v_{i} \in \{0,1\}$. ==TODO==.
- Broadcast $(B_i,\sigma_i)$.

##### Multiple candidates

Let $C_{1} \dots C_{l}$ be a set of all possible candidates.


The voting phase involves each party $P_{i}\dots,P_k$:
- Select a vote $v_{ij} \in \{0,1\} \simeq \{\textrm{"no", "yes"}\}$ for each candidate $j \in \{1 \dots l\}$.
- Compute a ballot using ElGamal encryption for $B_i = (r_i \times G,\ r_i \cdot \mathbf{E} + v_{i1} C_1 + \dots + v_{il} C_l)$, where
	- $r_{i} \in_{R} \mathbb{Z}_q$ is a blinding factor for user $i$, and 
	- $C_{1,}\dots, C_{l}$ are independent generators (one for each candidate).
- Compute a $\Sigma$-proof that $B_i$ is correctly formed. Namely that each $v_{ij} \in \{0,1\}$ and that $\sum_{j=1}^{l}v_{ij}=1$. ==TODO==.
- Broadcast $(B_i,\sigma_i)$.

##### State after Round 2.

After the voting phase has completed (once it reached $n$ messages or after a predefined period). The message board state is appended by:
- $\{(B_{i}, \sigma_i) : 1 \leq i \leq k\}$, set of encrypted votes casted by $k$ voters, along with ZKPs showing that $v_{ij}$ is one of $\{0,1\}$.

# Round 3. Tally

The decryption and tally is achieved via $(t,m)$ Threshold ElGamal Decryption. 

#### One-candidate tally

The tallying phase involves any subset $t \leq m$ of $P_{i} \dots, P_t$:

- The sum of the first part of the ballots (aka. shared keys)  $A = \sum_{i=1}^k r_{i} \times G$.
- Multiply it with the share of the decryption key $\mathbf{A}_i=\mathbf{d}_i \times A = \mathbf{d}_i \times G \times \sum_{i=1}^k r_{i}$.
- Broadcast $\mathbf{A}_i$.

Everyone can then calculate:
- Compute $Z=\sum_{i=1}^k \mathbf{A_i} \times \Pi_{j=1}^t \frac{j}{j-i}, i\neq j$. 
- Sum of the second part $B=\sum_{i=1}^k r_{i} \times \mathbf{E} + xv \times C$.
- The decryption of the partial result is calculated as follows $$\begin{aligned} M&=B-Z \\\
&= \sum_{i=1}^k r_{i} \times \mathbf{E} + xv \times C - Z\\\

&= \sum_{i=1}^k r_{i} \times \mathbf{E} + xv \times C - \sum_{i=1}^k \mathbf{A_i} \times \Pi_{j=1}^t \frac{j}{j-i}\\\

&= \sum_{i=1}^k r_{i} \times \mathbf{E} + xv \times C - \sum_{i=1}^k \mathbf{d}_i \times G \times \sum_{i=1}^k r_{i} \times \Pi_{j=1}^t \frac{j}{j-i}\\\

&= \sum_{i=1}^k r_{i} \times \mathbf{E} + xv \times C - G \times \sum_{i=1}^k r_{i} \times \sum_{i=1}^k \mathbf{d}_i \times \Pi_{j=1}^t \frac{j}{j-i}\\\

&= \sum_{i=1}^k r_{i} \times \mathbf{E} + xv \times C - G \times \sum_{i=1}^k r_{i} \times \mathbf{d}\\\

&= \sum_{i=1}^k r_{i} \times \mathbf{E} + xv \times C - \sum_{i=1}^k r_{i} \times \mathbf{E}\\\


&=xv \times C
\end{aligned}$$.
- The total number of $\textrm{"yes"}$ votes is $x$. To extract the number we use lookup table.
- ==TODO: lookup table==

#### Multiple-candidates tally
- ==TODO: write multi-candidate==

#### State after Round 3.

