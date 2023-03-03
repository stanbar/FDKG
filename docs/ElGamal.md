ElGamal cryptosystem allows for public-key encryption and digital signatures.

Its security is based on the Discrete Logarithm Problem; namely, having $Y=g^{x} \pmod p$ it is difficult to determine $x$, even if we have $Y, g$ and $p$.

With ElGamal, the receiver Bob, creates its private key by sampling a random scalar $x$, then he computes his public key, by calculating $Y=g^{x} \pmod p$. Where the $g$ and $p$ are publicly known parameters.

The sender, Alice, willing to encrypt a message M to Bob, first samples random scalar $k$, and then computes a ciphertext consisting of two parts, $a=g^{k} \pmod p$, and $b=y^{k} \cdot M \pmod p$. The cipher text $(a,b)$ is then send to Bob.

Bob can decrypt the message with $M=\frac{b}{a^{x}}\pmod p$

The equation holds because $\frac{b}{a^{x}}\pmod p =\frac{y^{k} \cdot M}{(g^k)^x}=\frac{(g^x)^k\cdot M}{g^{xk}}=\frac{g^{xk} \cdot M}{g^{xk}} \pmod p =M$   
#### Elliptic Curve ElGamal (ECEG) 

Elliptic Curve ElGamal uses [[Elliptic Curve Cryptography]]. Similar to Finite Field version of ElGamal, ECEG is based on EC Discrete Logarithm Problem (ECDLP); namely, having $Y=x \times G$ — where $G$ is a base point on a curve $E(\mathbb{F}_q)$, where $q=p^n$ and $p$ is a large prime — it is difficult to determine $x$, even if we have $G, Y$ and $q$.

With ECEG is similar however we use multiplication instead of exponentiation and addition instead of multiplication.

- Bob generats its private key by sampling random $x \in_R \mathbb{Z}$, then he computes his public key $$Y=x \times G$$And sends $Y$ to Alice.
- Alice samples random number $k \in_R \mathbb{Z}$ and computes a ciphertext $$(A=k\ times G, B=k \times Y + M)$$And sends it to Bob.
- Bob decrypts the ciphertext with $M=B - x \times A$

The equation holds because $$B - x \times A=(k \times Y + M) - (x \times G \times k) = (k \times x \times G + M) - (k \times x \times G)=M$$

---

ElGamal encryption is basically message $M$ shifted by a shared key derived using [DHKE](https://en.wikipedia.org/wiki/Diffie–Hellman_key_exchange), where the public key (used to derive the shared key) is provided along the ciphertext (the first part i.e., $A = k \times G$).
