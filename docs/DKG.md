### Distributed Encryption Key Generation

Once the network is established nodes execute the first MPC functionality $F_1$, which lets nodes jointly compute $\textrm{PK} \equiv \textrm{SK} * g$, without reconstructing $\textrm{SK}$ on any single device. This is achieved using Shamir Secret Sharing (SSS) or Distributed Key Generation (DKG) schemes [@gennaroSecureDistributedKey2007; @boldyrevaThresholdSignaturesMultisignatures2003].

Symbolically, the functionality $F_1$ is defined as follows: $$F_1(\mathrm{SK}_1, ..., \mathrm{SK}_N) = DerivePubKey(DKG(\mathrm{SK}_1, ..., \mathrm{SK}_N)) \rightarrow PK$$

![Setup phase of the proposed i-voting system.](setup.png){#fig:setup}

The reconstruction of a $\textrm{SK}$ is possible only if a sufficient number of votes (predefined threshold) collude. It would require executing malicious functionality $F_m(\mathrm{SK}_1, ..., \mathrm{SK}_N)=DerivePrivKey(\mathrm{SK}_1, ..., \mathrm{SK}_N) \rightarrow \textrm{SK}$. The situation should not happen under the honest majority assumption. 

### ElGamal Threshold Cryptosystem

ElGamal Threshold Cryptosystem (t,n) over an Elliptic Curve $E_p$, $p$ being a large prime, with the following parameters:
- $G$ is a generator point of $E_p$ with order $q$.
- A dealer chooses a polynomial $f(x)=s+a_{1}x + \dots + a_{t - 1}x \in Z_q[x]$ where $s \in Z_q$ is the secret key of the cryptosystem.
- $Y=sG$ is the public key.
- The dealer computes and distributes the secret private shares $s_{i}$ to $P_i$ as $f(i)$, $i \in 1,\dots,n$.
- The secret key can be reconstructed using any $t\leq n$ shares $f(1), \dots, f(t)$, because $s=\sum_{i=1}^{t}\prod_{j=1}^{t} \frac{j}{j-i}$, $i\neq j$ .

### FROET: Flexible Round-Optimized ElGamal Threshold Decryption

For DKG we use the FROST protocol designed for threshold Ed25519 signing. We take only the first part of the protocol that generates the secret shares. Then we implement our own logic which will decrypt the votes. In those terms, our protocol should be called **FROET: Flexible Round-Optimized ElGamal Threshold Decryption**.

