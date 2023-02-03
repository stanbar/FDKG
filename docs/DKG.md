### Distributed Encryption Key Generation

Once the network is established nodes execute the first MPC functionality $F_1$, which lets nodes jointly compute $\textrm{PK} \equiv \textrm{SK} * g$, without reconstructing $\textrm{SK}$ on any single device. This is achieved using Shamir Secret Sharing (SSS) or Distributed Key Generation (DKG) schemes [@gennaroSecureDistributedKey2007; @boldyrevaThresholdSignaturesMultisignatures2003].

Symbolically, the functionality $F_1$ is defined as follows: $$F_1(\mathrm{SK}_1, ..., \mathrm{SK}_N) = DerivePubKey(DKG(\mathrm{SK}_1, ..., \mathrm{SK}_N)) \rightarrow PK$$
The reconstruction of a $\textrm{SK}$ is possible only if a sufficient number of votes (predefined threshold) collude. It would require executing malicious functionality $F_m(\mathrm{SK}_1, ..., \mathrm{SK}_N)=DerivePrivKey(\mathrm{SK}_1, ..., \mathrm{SK}_N) \rightarrow \textrm{SK}$. The situation should not happen under the honest majority assumption. 

![Setup phase of the proposed i-voting system.](setup.png){#fig:setup}

---

https://asecuritysite.com/kryptology/dkg
https://github.com/taurusgroup/multi-party-sig


Real World cryptography

https://rwc.iacr.org/

Write down with some details what is our protocol.

Focus on 1-2 usecases, say that in this scenario private is important, focus on that small market.


Spin up p2p network. 

Talk from Real-world cryptography, on how constitution have to be changed. 

But there is a trust in institution 

People actually don't appreciate private so much.

They are ok with trusting authority.

We need a sense of participants. 

---

Million of people are registered. 

How to make sure that

DKG is pre-voting. If DKG is precomputed.

Prepare one use case and make sure at least for that use case is the best one.

Iven t