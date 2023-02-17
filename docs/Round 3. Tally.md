#### One candidate tally
Let's start with a simple one-candidate tally

Recall, a single encrypted vote consists of two parts, the encrypted message, and the public part of the shared secret. Represented as a tuple $(a_{i}G + x_{i}H; K_i)$, where:
- $a_i$ is a blinding factor;
- $x_i$ is either 1 or 0 for option yes or no..
- $K_i$ is a public part of the DHKE.

The tally procedure goes as follows:
1. Accumulate all encrypted messages (first part of the tuple): $\mathrm{sumCiphers} = \sum_{i \dots n} a_{i}G + x_{i}H$;
2. Accumulate all public parts (second part of the tuple): $\mathrm{sumPubs} = \sum_{i \dots n} K_i$.

> [!INFO]
To decrypt the results we need to calculate the $\mathrm{batchDecryptor} = p \cdot \mathrm{sumPubs}$. Since it requires multiplying by decryption key $p$, which we don't want to reconstruct at any single device, we compute it inside MPC. It's the only computation that needs to be done inside MPC.

3. $[\mathrm{batchDecryptor}] = [p] \cdot \mathrm{sumPubs}$;
4. $\mathrm{batchDecryptor} = \mathrm{open}([\mathrm{batchDecryptor}])$
5. $\mathrm{result} * G = \mathrm{sumCiphers} - \mathrm{batchDecryptor}$.
6. To extract the $\mathrm{result}$ (calculate "discrete logarithm") efficiently we search over precomputed lookup table. Since the result is guaranteed to be small, between $0 \leq result \leq n$.
7. Create [[PoD - Proof of Decryption]] $\pi$.
8. As a result we publish (set of transactions, $\mathrm{batchDecryptor}, \mathrm{result}, \pi$)


#### Multiple candidates
Multiple candidates vote as the following structure

Assume 2 candidates
Ballot:  $A_i = a_iG + x_1 H_1 + x_2 H_2$
- $a$ is blinding factor;
- $x_1$ is vote for 1 candidate;
- $x_2$ is vote for 2 candidate;

As a result we will have: (total sum for 1st candidate) $H_1$ + (total sum for 2nd candidate)$H_2$.

Lookup table would be n^2, where n is total possible number of votes. For 1000 voters we get table of size 1M, after that it get's much harder.