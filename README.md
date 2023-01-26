# Overview
The project aims to solve the problem of internet voting by employing blockchain [@baranskiPracticalIVotingStellar2020], MPC [@evansPragmaticIntroductionSecure2018], co-zkSNARK [@ozdemirExperimentingCollaborativezkSNARKs2022], and an ad-hoc peer-to-peer network consisting of voters’ smartphones and laptops. Resulting in an internet voting protocol that achieves security, integrity, coercion-resistance, and privacy, without any trusted third party.

# Value proposition

1. Convenience, and safety. No need to leave your home to participate in voting.
2. Cheap. No need to print ballot papers or hire people to coordinate the voting process.
3. Trustless, secure, transparent. Users don't need to trust the authorities that their votes have been included and that the counting process has been correct.
4. Increased turnouts and the frequency of votings.
5. Enabling direct democracy, liquid democracy, and all other sorts of voting methods like Approval voting, Alternative vote, Score voting, and many others [@laslierLoserPluralityVoting2011]


# Technical vision

We will implement the proposed protocol by incrementally enhancing the current one [@baranskiPracticalIVotingStellar2020]:

1. First, we will develop an MPC protocol to compute the encryption key. This is achieved using Shamir Secret Sharing (SSS) or Distributed Key Generation (DKG) schemes [@gennaroSecureDistributedKey2007; @boldyrevaThresholdSignaturesMultisignatures2003]. The MPC-generated encryption key will replace the current server-generated encryption key.
2. Then, we will replace the current storage mechanism based on Stellar transactions, with the new Stellar's Soroban smart contract platform [^soroban].
3. Then, we will implement the MPC protocol for decryption and tally the votes stored in Soroban smart contract. This will remove the need for trusted-third-party used in the current protocol [@baranskiPracticalIVotingStellar2020]. 
4. Then, we will develop the zkSNARK protocol for generating proof of correctness of both MPC functionalities. The generated proof of correctness will be published to smart contracts along with the calculated results. 
