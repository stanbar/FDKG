ElGamal encryption/decryption

$M$ - cleartext
$p$ - server secret key
$P = pG$ - server public key

Encryption:
$(C = M + kP; K = kG)$, where $k$ is a random value.

Decryption:
$M = C - pK$

It works because $pK = kP$; therefore, $M = C - pK = (M + kP) - pk = (M + kP) - kP$

ElGamal encryption is basically message $M$ shifted by a shared key derived using [DHKE](https://en.wikipedia.org/wiki/Diffie–Hellman_key_exchange), where the public key (used to derive the shared key) is provided along the ciphertext (the second part i.e., $K = kG$).
