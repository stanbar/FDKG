Name: Stanislaw Baranski
Date: 03.02.2023

# Results
%%Insert a summary of the results obtained from the research%%

In this week we were researching:
- We were lookig for ready-to-use DKG implementation and found a few promissing: https://github.com/taurusgroup/frost-ed25519
- Prepared the roadmap
  

# Challenges and open questions
%%Insert a summary of the challenges and open questions you have%%

What platform to use? A web app would be ideal. But it may require us to write a lot of crypto-code.

We are wondering about building CLI PoC first.


# Discussion
%%Insert a discussion of the results and their significance%%

We have clarified the encryption scheme and proof generations.

# Conclusions
%%Insert the conclusions drawn from the research and any plans for future research or action%%
We decided to write circuits in circom.
We decided to reuse some of the circuits from [MACI](https://github.com/privacy-scaling-explorations/maci/tree/master/circuits/circom).
We decided to use ElGamal on babyJubJub + Groth16 BN-254.

Snarks for simplicity of implementation / potentially incorporating some more involved voting schemas like QV.

We decided to piggyback on some existing public blockchain, but use it in a pluggable way, so that in future it can be replaced by any private lightweight ad-hoc blockchain running on voters’ smartphones. We don’t want to focus on building blockchain during this programme.
We don't need an EVM-compatible blockchain, it's just a bunch of equations to verify SNARKs.

# Learning Resources
%%Insert the material or notes that you would like to share with the community%%
Docs: [delendum-xyz/private-voting](https://github.com/delendum-xyz/private-voting/tree/main/docs)
