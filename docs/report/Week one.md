Name: Stanislaw Baranski
Title: Mr.
Date: 26.01.2023

# Results
%%Insert a summary of the results obtained from the research%%

In this week we were researching:
- Comparing our protocol with the suggested by Shashank’s paper “A Smart Contract for Boardroom Voting with Maximum Voter Privacy”;
- Researching big-picture concept of our protocol;
- Figuring out zkp schemes;
- Forecasting possible challenges, and ready to use solutions.
  
In result, we found disadvantages of the system suggested by Shashank, namely, the proposed solution is 1-of-n liveness, meaning that everyone can deny the whole voting procedure, by not submitting the vote (which we consider highly possible).

In our solution we use k-of-n (where k < n, where k=xn, x ~= 0.9) threshold sheme using Shamir Secret Sharing.

Our protocol is 3-round, elGamal, Groth16 proofs.


We were discussing whether we want to generate proofs using Groth16 zkSNARK or write our own zkp, but decided to use Groth16 and reuse existing circuits from [MACI](https://github.com/privacy-scaling-explorations/maci/tree/master/circuits/circom) and potentially support more complex schemes like Quadratic Voting.

# Challenges and open questions
%%Insert a summary of the challenges and open questions you have%%

We are not sure what is the good way of doing SSS in our scenario but looking into it

We need to find out ready-to-use [PVSS](https://en.wikipedia.org/wiki/Publicly_Verifiable_Secret_Sharing#Chaum-Pedersen_Protocol) protocol to generate the encryption key among voters.

Also, we have to figure out how to handle p2p networking.

# Discussion
%%Insert a discussion of the results and their significance%%


# Conclusions
%%Insert the conclusions drawn from the research and any plans for future research or action%%
We decided to write circuits in circom.
We decided to reuse some of the circuits from [MACI](https://github.com/privacy-scaling-explorations/maci/tree/master/circuits/circom).
We decided to use ElGamal on babyJubJub + Groth16 BN-254.

Snarks for simplicity of implementation / potentially incorporating some more involved voting schemas like QV.

We decided to piggyback on some existing public blockchain, but use it in a pluggable way, so that in future it can be replaced by any private lightweight ad-hoc blockchain running on voters’ smartphones. We don’t want to focus on building blockchain during this programme.
We don't need an EVM-compatible blockchain, it's just a bunch of equations to verify SNARKs.

# References
%%Insert a list of references used in the report%%

# Attachments
%%Insert any relevant attachments or appendices, such as data tables or figures%%

# Resource Inquiry
%%Insert the availability, accessibility, and suitability of resources we provide, as well as identifying any other resources you may need%%


# Learning Resources
%%Insert the material or notes that you would like to share with the community%%

TODO:
- Write about [[DKG]]
- Write about our protocol [[Protocol]]