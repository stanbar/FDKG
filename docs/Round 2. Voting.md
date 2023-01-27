We use [[Homomorphic Encryption ElGamal vs Paillier|ElGamal homomorphic encryption]] + Lookup Table of trapdoors to decrypt the results. It's the same encryption scheme used in [[Comparision to Polys|Polys]]. 

Let's first consider simple one candidate protocol.

#### One candidate, two options: yes/no
- Selection yes or no is denoted by $x = 1\ \mathrm{or}\ 0$
- Then, the single candidate vote is of a form: $A_{i} = a_{i} G + x_i H$, where
	- $i$ is a voter index;
	- $a_i$ is a blinding factor of voter $i$;
	- $G$ and $H$ are public parameters.
 - [[PoB - Proof of Ballot]]

#### Multiple candidates vote transaction
- Selection yes or no for candidate $c \in 1 \dots C$ is denoted by $x_{c} = 1\ \mathrm{or}\ 0$, where $C$ is total number of candidates;
- For simplicity assume $C=2$
- Then, the 2-candidate vote is of a form $A_{i}= a_{i}G + x_{1}H_{1} + x_{2}H_{2}$, where
	- $i$ is a voter index;
	- $a_i$ is a blinding factor of voter $i$;
	- $G$, $H_1$, $H_2$ are public parameters.
- The sum of all votes would be of a form $A = \sum_{1 \dots n} A_i$ which is $\sum_{1 \dots n} a_{i}G + X_{1}H_{1} + X_{2}H_2$, where: 
	- $X_1$ is the total sum for 1st candidate;
	- $X_2$ is the total sum for 2nd candidate.
 - [[PoB - Proof of Ballot]]

Lookup table would be of size $n^2$, where $n$ is total possible number of votes. For up to 1000 voters the lookup table is of size 1M, which is fine. Then it get's much harder.

## Proof of correctness

[[PoB - Proof of Ballot]]