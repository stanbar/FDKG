---
bibliography: bibliography.bib
csl: ieee-with-url.csl
---

# Problem statement

Voting is one of the most popular mechanisms for collective
decision-making; yet, it’s still something we can not do securely
online.

There are several ways of voting; But, internet voting is the most
conventional, cheapest, fastest, and safest (e.g., during the outbreak
of COVID-19), and hence, a preferred method for conducting voting.

Internet voting can increase turnout and the frequency of votings, but
most importantly, it can catalyze the further development of modern
democracy. Enabling practical applications of direct democracy, liquid
democracy, and all other sorts of voting methods like Quadratic Voting,
Approval voting, Alternative vote, Score voting, and many others \[1\].

Visions of smart cities, crypto cities \[2\], Decentralised Autonomous
Organisations \[3\], and other forms of algorithmic governance \[4\]
rely on the existence of internet voting, so there is a high demand for
such systems.

Online voting is often compared to online banking. Admittedly, online
voting requires much higher security than online banking. Many
researchers and experts in the field doubt the possibility of conducting
public voting over the internet \[5\]–\[10\]. The resistance lies—among
others—in insufficient confidence in the technology and a need for trust
in the authorities controlling the voting process.

Most of the internet protocols rely on a trusted third party. They
differ in what the server can or cannot do. The honesty of the trusted
third party determines either anonymity, privacy, or coercion resistance
properties.

Some of them use blockchain for integral and transparent storage (Voatz,
Polys, MACI).

As described in \[11\], the architecture usually looks as follows
(Figure [1](#fig:bc-ttp)):

- Users participate by signing a message with their private key,
  encrypting the signed message to a public key published by a central
  server, and publishing the encrypted signed message to the blockchain.
- The server downloads the messages from the blockchain, decrypts them,
  processes them, and outputs the result along with a ZK-SNARK to ensure
  that they did the computation correctly.

<figure>
<img src="img/blockchain-and-ttp.png" id="fig:bc-ttp"
alt="Figure 1: Blockchain and TTP" />
<figcaption aria-hidden="true">Figure 1: Blockchain and TTP</figcaption>
</figure>

Some solutions are distributing the trusted third party using MPC
(Civitas, Swisspost/Scytl, iVoting).

We want to go even further and conduct the voting on voters’ end devices
(PC, laptops, or even smartphones) using both blockchain and MPC (see
Figure [2](#fig:trust-models)).

<figure>
<img src="img/trust-model-stellot.png" id="fig:trust-models"
alt="Figure 2: Trust model" />
<figcaption aria-hidden="true">Figure 2: Trust model</figcaption>
</figure>

Most people think about voting in terms of presidential elections.
However, voting is used also in small, local votings like housing
associations, board members, contests, and all forms of committees.

We don’t want to build:

- A large-scale voting system for presidential elections;
- A voting system for crypto space only;
- A perfectly secure, coercion-resistant, protocol.

Rather, we do want to build:

- A voting protocol for small to medium size voting like 100 voters;
- A voting protocol for people, without the crypto background;
- A decentralised and secure enough protocol that works.

“Blockchain voting is overrated among uninformed people but underrated
among informed people,” says Vitalik Buterin, the co-founder of
Ethereum, suggesting more optimism in academia about internet voting
\[11\].

# Goal

The project aims to solve the problem of internet voting by employing
blockchain \[12\], MPC \[13\], zkSNARK \[14\], and an ad-hoc
peer-to-peer network consisting of voters’ smartphones and laptops.
Resulting in an internet voting protocol that achieves security,
integrity, and privacy, without any trusted third party.

# Value proposition

1.  Convenience, and safety. No need to leave your home to participate
    in voting.
2.  Cheap. No need to print ballot papers or hire people to coordinate
    the voting process.
3.  Trustless, secure, transparent. Users don’t need to trust the
    authorities that their votes have been included and that the
    counting process has been correct.
4.  Increased turnouts and the frequency of votings.
5.  Enabling direct democracy, liquid democracy, and all other sorts of
    voting methods like Approval voting, Alternative vote, Score voting,
    and many others \[1\]

# Technical vision

We will implement the proposed protocol by incrementally enhancing the
current one \[12\]:

1.  First, we will develop an MPC protocol to compute the encryption
    key. This is achieved using Shamir Secret Sharing (SSS) or
    Distributed Key Generation (DKG) schemes \[15\], \[16\]. The
    MPC-generated encryption key will replace the current
    server-generated encryption key.
2.  Then, we will replace the current storage mechanism based on Stellar
    transactions, with the new Stellar’s Soroban smart contract platform
    [^1].
3.  Then, we will implement the MPC protocol for decryption and tally
    the votes stored in Soroban smart contract. This will remove the
    need for trusted-third-party used in the current protocol \[12\].
4.  Then, we will develop the zkSNARK protocol for generating proof of
    correctness of both MPC functionalities. The generated proof of
    correctness will be published to smart contracts along with the
    calculated results.

# Technical overview

Voters form a peer-to-peer network using their smartphones. Let’s assume
a voter consists of a smartphone and a key pair (see Figure
[3](#fig:notation)). 

<figure>
<img src="img/notation.png" id="fig:notation" width="200"
alt="Figure 3: Notation." />
<figcaption aria-hidden="true">Figure 3: Notation.</figcaption>
</figure>

The first step that the network of voters’ smartphones has to do is to
form a peer-to-peer (or rather, smartphone-to-smartphone) network
\[17\], \[18\].

A distributed network consisting of eligible voters runs a blockchain
and MPC software. Consequently, two functionally separate networks
(blockchain and MPC) are running on voters’ devices. Blockchain network
act as bulletin boards, where all transactions are collected and
accessible to anyone. MPC network offers two functionalities: 1) jointly
generating encryption key; 2) jointly decrypting and tallying votes,
along with producing a zk-SNARK proof. The networks are communicating
with each other for fetching votes and published results. A big-picture
idea of the proposed system is presented in Figure
[4](#fig:architecture).

<figure>
<img src="img/overview.png" id="fig:architecture"
alt="Figure 4: Overview of the proposed system" />
<figcaption aria-hidden="true">Figure 4: Overview of the proposed
system</figcaption>
</figure>

The voting process consists of three phases (rounds): 

0.  bootstrapping p2p network phase presented in section
    [5.0.1](#bootstraping-p2p-network);
1.  distributed encryption key generation phase presented in section
    [5.0.2](#distributed-encryption-key-generation) and figure
    [5](#fig:setup); 
2.  casting votes phase presented in section [5.0.3](#voting-phase) and
    figure [6](#fig:voting); 
3.  tally phase presented in section [5.0.4](#tally-phase) and figure
    [7](#fig:tally).

### 0. Bootstraping p2p network

The first step that the network of voters’ smartphones has to do is to
form a peer-to-peer (or rather, smartphone-to-smartphone) network
\[17\], \[18\]. The network should be closed-membership, meaning that
only eligible participants are allowed to join. This is achieved by
publishing a predefined list of public keys $R=\{pk_1,...,pk_n\}$
corresponding to the eligible voters, who holds secret keys $sk$, such
that, $pk \equiv g * sk$ for some known generator $g$.

Depending on the scale and type of voting, such a list can be created by
organizers, or locally by the voters themselves. In order to prevent
selling keypairs to briber, the keypairs should be associated with some
stake: proof of citizenship of a country, high reputation in a local
community, proof of humanity, or some amount of cryptocurrency, in such
a way that the value of a stake is worth more than a vote from such
address.

To establish a peer-to-peer (p2p) network over the internet it is
required to solve many network-related problems. Namely,

- Most of smartphones connected to the Internet are behind the NAT or
  some kind of firewall. Such devices work in asymmetric access policy,
  in which they can establish connections to other devices, but others
  can not establish connections to them. In settings where all devices
  work in asymmetric access policly it is impossible to start any
  connection \[19\]. To solve the issue we can use techniques like
  Traversal Using Relays around NAT (TURN), Circuit Relays, Rendezvous
  servers \[20\], \[21\], Hole Punching, Session Traversal Utilities for
  NAT (STUN) \[22\], Interactive Connectivity Establishment (ICE)\[23\],
  and WebRTC \[24\].
- In a p2p network the number of connections between peers grows
  quadratically, i.e., $n^2$, where $n$ is the number of peers in the
  network. Moreover, there may be multiple connections between peers for
  each used protocol. To reduce the number of connections, we can use
  multiplexing like QUIC, Yamux, or Mplex \[25\]), which allows re-using
  established connections for several protocols.
- The connections must be authenticated and encrypted. To solve the
  issue, we can use techniques like TLS \[26\] or Noise \[27\].
- Peers must be able to discover each other. To do this, depending on
  network conditions, we can use Bootstrap peer list, Multicast DNS
  (mDNS), or Rendezvous servers.

To solve those issues we piggyback on the libp2p \[28\], an open source
library, which addresses all of the mentioned issues.

### 1. Distributed Encryption Key Generation

Once the network is established nodes execute the first MPC
functionality $F_1$, which lets nodes jointly compute
$\textrm{PK} \equiv \textrm{SK} * g$, without reconstructing
$\textrm{SK}$ on any single device. This is achieved using Shamir Secret
Sharing (SSS) or Distributed Key Generation (DKG) schemes \[15\],
\[16\].

Symbolically, the functionality $F_1$ is defined as follows:
$$F_1(\mathrm{SK}_1, ..., \mathrm{SK}_N) = DerivePubKey(DKG(\mathrm{SK}_1, ..., \mathrm{SK}_N)) \rightarrow PK$$
The reconstruction of a $\textrm{SK}$ is possible only if a sufficient
number of votes (predefined threshold) collude. It would require
executing malicious functionality
$F_m(\mathrm{SK}_1, ..., \mathrm{SK}_N)=DerivePrivKey(\mathrm{SK}_1, ..., \mathrm{SK}_N) \rightarrow \textrm{SK}$.
The situation should not happen under the honest majority assumption. 

<figure>
<img src="img/setup.png" id="fig:setup"
alt="Figure 5: Setup phase of the proposed i-voting system." />
<figcaption aria-hidden="true">Figure 5: Setup phase of the proposed
i-voting system.</figcaption>
</figure>

Read more \[\[Round 1. Setup\]\]

### Voting phase

We use \[\[Homomorphic Encryption ElGamal vs Paillier\|ElGamal
homomorphic encryption\]\] + \[\[Lookup Table\]\] of trapdoors to
decrypt the results. It’s the same encryption scheme used in
\[\[Comparision to Polys\|Polys\]\].

The voting process is illustrated in Figure [6](#fig:voting).

<figure>
<img src="img/voting.png" id="fig:voting" width="500"
alt="Figure 6: Voting phase, voters casting votes to the blockchain" />
<figcaption aria-hidden="true">Figure 6: Voting phase, voters casting
votes to the blockchain</figcaption>
</figure>

Let’s first consider simple one candidate protocol.

#### One candidate, two options: yes/no

- Selection yes or no is denoted by $x = 1\ \mathrm{or}\ 0$
- Then, the single candidate vote is of a form:
  $A_{i} = a_{i} G + x_i H$, where
  - $i$ is a voter index;
  - $a_i$ is a blinding factor of voter $i$;
  - $G$ and $H$ are public parameters.
- \[\[PoB - Proof of Ballot\]\]

#### Multiple candidates vote transaction

- Selection yes or no for candidate $c \in 1 \dots C$ is denoted by
  $x_{c} = 1\ \mathrm{or}\ 0$, where $C$ is total number of candidates;
- For simplicity assume $C=2$
- Then, the 2-candidate vote is of a form
  $A_{i}= a_{i}G + x_{1}H_{1} + x_{2}H_{2}$, where
  - $i$ is a voter index;
  - $a_i$ is a blinding factor of voter $i$;
  - $G$, $H_1$, $H_2$ are public parameters.
- The sum of all votes would be of a form $A = \sum_{1 \dots n} A_i$
  which is $\sum_{1 \dots n} a_{i}G + X_{1}H_{1} + X_{2}H_2$, where:
  - $X_1$ is the total sum for 1st candidate;
  - $X_2$ is the total sum for 2nd candidate.
- \[\[PoB - Proof of Ballot\]\]

Read more \[\[Round 2. Voting\]\]

### Tally phase

Once the election period has finished, voters agree on a common state of
the recorded transactions on the blockchain.

Then, using the second functionality $F_2$, voters jointly perform
decentralized decryption and tallying of the ballots without
reconstructing the decryption key on a single device.

Internally, $F_2$ validates all the recorded transactions and modifies
their internal state accordingly to the content and the type of the
transaction. Process each transaction as follows:

#### One candidate tally

Let’s start with simple one candidate tally

Recall, single encrypted vote consist of two parts, the encrypted
message, and shared secret. Represented as a tuple
$(a_{i}G + x_{i}H; K_i)$, where: 1. $a_i$ is a blinding factor; 2. $x_i$
is either 1 or 0 for option yes or no.. 3. $K_i$ is a public part of the
DHKE.

The tally procedure goes as follows: 1. Accumulate all encrypted
messages (first part of the tuple):
$S = \sum_{i \dots n} a_{i}G + x_{i}H$; 2. Accumulate all public parts
(second part of the tuple): $\mathrm{accKeys} = \sum_{i \dots n} K_i$.

> \[!INFO\] To decrypt the results we need to calculate the
> $\mathrm{batchDecryptor} = p \cdot \mathrm{accKeys}$. Since it
> requires multiplying by decryption key $p$, which we don’t want to
> reconstruct at any single device, we compute it inside MPC. It’s the
> only computation that needs to be done inside MPC.

3.  $[\mathrm{batchDecryptor}] = [p] \cdot \mathrm{accKeys}$;
4.  $\mathrm{batchDecryptor} = \mathrm{open}([\mathrm{batchDecryptor}])$
5.  $\mathrm{result} * G = S - \mathrm{batchDecryptor}$.
6.  create \[\[PoD - Proof of Decryption\]\] $\pi$.
7.  To extract the $\mathrm{result}$ (calculate “discrete logarithm”)
    efficiently we search over precomputed lookup table. Since the
    result is guaranteed to be small, between $0 \leq result \leq n$.
8.  As a result we publish (set of transactions, $batchDecryptor$,
    $result$, $\pi$)

Finally, the key shares $S_i$ should be destroyed from all voters’
devices. As long as the majority of the nodes follow the procedure, the
decryption key can not be reconstructed, that is, the malicious
functionality $F_m$ can not be performed.

The results and certificate are published on the Blockchain (bulletin
board). See Figure [7](#fig:tally). 

<figure>
<img src="img/tally.png" id="fig:tally"
alt="Figure 7: Tally phase of the proposed i-voting system." />
<figcaption aria-hidden="true">Figure 7: Tally phase of the proposed
i-voting system.</figcaption>
</figure>

Read more \[\[Round 3. Tally\]\]

### Verification

After the results and the corresponding certificate has been published
on the blockchain. Anyone—not only the voters taking part in the
voting—can verify the correctness of the results using zk-SNARK
verifier.

# Open questions

- How to design a protocol resilient to nodes’ unavailability?
- How much RAM and disk space does the proposed protocol use?
- How long does it take to execute both functionalities on a mid-range
  smartphone?
- How to prevent DDoS attacks?
- How many votes per second can handle the proposed protocol?
- Which MPC framework to use?
- Which circuit compiler to use
  (e.g. [libsnark](https://github.com/scipr-lab/libsnark),
  [bellman](https://github.com/zkcrypto/bellman),
  [ZoKrates](https://github.com/JacobEberhardt/ZoKrates),
  [Snarky](https://github.com/o1-labs/snarky),
  [Circom](https://github.com/iden3/circom), or
  [others](https://zkp.science/))
- Which proving system to use
  ([libsnark](https://github.com/scipr-lab/libsnark),
  [bellman](https://github.com/zkcrypto/bellman), [dalek
  bulletproofs](https://github.com/dalek-cryptography/bulletproofs),
  [snarkjs](https://github.com/iden3/snarkjs), or
  [others](https://zkp.science/))
- What are the trust assumptions implied by each setup?
- Can we reuse the already established trusted setup? (e.g. from
  Ethereum, ZCash)

<div id="refs" class="references csl-bib-body">

<div id="ref-laslierLoserPluralityVoting2011" class="csl-entry">

<span class="csl-left-margin">\[1\] </span><span
class="csl-right-inline">J.-F. Laslier, “And the loser is... Plurality
Voting,” Jul-2011 \[Online\]. Available:
<https://hal.archives-ouvertes.fr/hal-00609810>. \[Accessed:
17-Sep-2022\]</span>

</div>

<div id="ref-buterinCryptoCities2021" class="csl-entry">

<span class="csl-left-margin">\[2\] </span><span
class="csl-right-inline">V. Buterin, “Crypto Cities,” 2021. \[Online\].
Available: <https://vitalik.ca/general/2021/10/31/cities.html>.
\[Accessed: 22-Aug-2022\]</span>

</div>

<div id="ref-wangDecentralizedAutonomousOrganizations2019"
class="csl-entry">

<span class="csl-left-margin">\[3\] </span><span
class="csl-right-inline">S. Wang, W. Ding, J. Li, Y. Yuan, L. Ouyang,
and F.-Y. Wang, “Decentralized Autonomous Organizations: Concept, Model,
and Applications,” *IEEE Transactions on Computational Social Systems*,
vol. 6, no. 5, pp. 870–878, Oct. 2019, doi:
[10.1109/TCSS.2019.2938190](https://doi.org/10.1109/TCSS.2019.2938190).
</span>

</div>

<div id="ref-GovernmentAlgorithm2022" class="csl-entry">

<span class="csl-left-margin">\[4\] </span><span
class="csl-right-inline">“Government by algorithm,” *Wikipedia*.
18-Aug-2022 \[Online\]. Available:
<https://en.wikipedia.org/w/index.php?title=Government_by_algorithm&oldid=1105084102>.
\[Accessed: 22-Aug-2022\]</span>

</div>

<div id="ref-parkGoingBadWorse2021" class="csl-entry">

<span class="csl-left-margin">\[5\] </span><span
class="csl-right-inline">S. Park, M. Specter, N. Narula, and R. L.
Rivest, “Going from bad to worse: From internet voting to blockchain
voting,” *Journal of Cybersecurity*, vol. 7, no. 1, p. tyaa025, 2021.
</span>

</div>

<div id="ref-mearianWhyBlockchainbasedVoting2019" class="csl-entry">

<span class="csl-left-margin">\[6\] </span><span
class="csl-right-inline">L. Mearian, “Why blockchain-based voting could
threaten democracy,” 12-Aug-2019. \[Online\]. Available:
<https://www.computerworld.com/article/3430697/why-blockchain-could-be-a-threat-to-democracy.html>.
\[Accessed: 30-Aug-2022\]</span>

</div>

<div id="ref-shanklandNoBlockchainIsn2018" class="csl-entry">

<span class="csl-left-margin">\[7\] </span><span
class="csl-right-inline">S. Shankland, “No, blockchain isn’t the answer
to our voting system woes,” 2018. \[Online\]. Available:
<https://www.cnet.com/news/privacy/blockchain-isnt-answer-to-voting-system-woes/>.
\[Accessed: 30-Aug-2022\]</span>

</div>

<div id="ref-leeBlockchainbasedElectionsWould2018" class="csl-entry">

<span class="csl-left-margin">\[8\] </span><span
class="csl-right-inline">T. B. Lee, “Blockchain-based elections would be
a disaster for democracy,” 06-Nov-2018. \[Online\]. Available:
<https://arstechnica.com/tech-policy/2018/11/blockchain-based-elections-would-be-a-disaster-for-democracy/>.
\[Accessed: 30-Aug-2022\]</span>

</div>

<div id="ref-schneierBlockchainVoting2020" class="csl-entry">

<span class="csl-left-margin">\[9\] </span><span
class="csl-right-inline">B. Schneier, “On Blockchain Voting,” 2020.
\[Online\]. Available:
<https://www.schneier.com/blog/archives/2020/11/on-blockchain-voting.html>.
\[Accessed: 30-Aug-2022\]</span>

</div>

<div id="ref-schneierBlockchainTrust2019" class="csl-entry">

<span class="csl-left-margin">\[10\] </span><span
class="csl-right-inline">B. Schneier, “Blockchain and Trust,” 2019.
\[Online\]. Available:
<https://www.schneier.com/blog/archives/2019/02/blockchain_and_.html>.
\[Accessed: 30-Aug-2022\]</span>

</div>

<div id="ref-buterinBlockchainVotingOverrated2021" class="csl-entry">

<span class="csl-left-margin">\[11\] </span><span
class="csl-right-inline">V. Buterin, “Blockchain voting is overrated
among uninformed people but underrated among informed people,” 2021.
\[Online\]. Available:
<https://vitalik.ca/general/2021/05/25/voting2.html>. \[Accessed:
22-Aug-2022\]</span>

</div>

<div id="ref-baranskiPracticalIVotingStellar2020" class="csl-entry">

<span class="csl-left-margin">\[12\] </span><span
class="csl-right-inline">S. Barański, J. Szymański, A. Sobecki, D. Gil,
and H. Mora, “Practical I-Voting on Stellar Blockchain,” *Applied
Sciences*, vol. 10, no. 21, p. 7606, Oct. 2020, doi:
[10.3390/app10217606](https://doi.org/10.3390/app10217606). \[Online\].
Available: <https://www.mdpi.com/2076-3417/10/21/7606>. \[Accessed:
19-Jul-2022\]</span>

</div>

<div id="ref-evansPragmaticIntroductionSecure2018" class="csl-entry">

<span class="csl-left-margin">\[13\] </span><span
class="csl-right-inline">D. Evans, V. Kolesnikov, and M. Rosulek, “A
pragmatic introduction to secure multi-party computation,” *Foundations
and Trends® in Privacy and Security*, vol. 2, no. 2–3, pp. 70–246, 2018.
</span>

</div>

<div id="ref-ozdemirExperimentingCollaborativezkSNARKs2022"
class="csl-entry">

<span class="csl-left-margin">\[14\] </span><span
class="csl-right-inline">A. Ozdemir and D. Boneh, “Experimenting with
Collaborative {zk-}SNARKs{}: {}Zero-Knowledge{} Proofs for Distributed
Secrets,” presented at the 31st USENIX Security Symposium (USENIX
Security 22), 2022, pp. 4291–4308 \[Online\]. Available:
<https://www.usenix.org/conference/usenixsecurity22/presentation/ozdemir>.
\[Accessed: 23-Dec-2022\]</span>

</div>

<div id="ref-gennaroSecureDistributedKey2007" class="csl-entry">

<span class="csl-left-margin">\[15\] </span><span
class="csl-right-inline">R. Gennaro, S. Jarecki, H. Krawczyk, and T.
Rabin, “Secure distributed key generation for discrete-log based
cryptosystems,” *Journal of Cryptology*, vol. 20, no. 1, pp. 51–83,
2007. </span>

</div>

<div id="ref-boldyrevaThresholdSignaturesMultisignatures2003"
class="csl-entry">

<span class="csl-left-margin">\[16\] </span><span
class="csl-right-inline">A. Boldyreva, “Threshold signatures,
multisignatures and blind signatures based on the gap-<span
class="nocase">Diffie-Hellman-group</span> signature scheme,” presented
at the International Workshop on Public Key Cryptography, 2003, pp.
31–46. </span>

</div>

<div id="ref-zhuangManagingAdHoc2013" class="csl-entry">

<span class="csl-left-margin">\[17\] </span><span
class="csl-right-inline">T. Zhuang, P. Baskett, and Y. Shang, “Managing
ad hoc networks of smartphones,” *International Journal of Information
and Education Technology*, vol. 3, no. 5, p. 540, 2013. </span>

</div>

<div id="ref-aloiSpontaneousSmartphoneNetworks2014" class="csl-entry">

<span class="csl-left-margin">\[18\] </span><span
class="csl-right-inline">G. Aloi, M. Di Felice, V. Loscrì, P. Pace, and
G. Ruggeri, “Spontaneous smartphone networks as a user-centric solution
for the future internet,” *IEEE Communications Magazine*, vol. 52, no.
12, pp. 26–33, Dec. 2014, doi:
[10.1109/MCOM.2014.6979948](https://doi.org/10.1109/MCOM.2014.6979948).
</span>

</div>

<div id="ref-fordPeertoPeerCommunicationNetwork2005" class="csl-entry">

<span class="csl-left-margin">\[19\] </span><span
class="csl-right-inline">B. Ford, P. Srisuresh, and D. Kegel,
“Peer-to-Peer Communication Across Network Address Translators.” in
*USENIX Annual Technical Conference, General Track*, 2005, pp. 179–192.
</span>

</div>

<div id="ref-reddyTraversalUsingRelays2020" class="csl-entry">

<span class="csl-left-margin">\[20\] </span><span
class="csl-right-inline">T. Reddy, A. Johnston, P. Matthews, and J.
Rosenberg, “Traversal Using Relays around NAT (TURN): Relay Extensions
to Session Traversal Utilities for NAT (STUN),” RFC Editor, RFC8656,
Feb. 2020 \[Online\]. Available:
<https://www.rfc-editor.org/info/rfc8656>. \[Accessed:
04-Oct-2022\]</span>

</div>

<div id="ref-libp2pCircuitRelay" class="csl-entry">

<span class="csl-left-margin">\[21\] </span><span
class="csl-right-inline">libp2p, “Circuit Relay.” \[Online\]. Available:
<https://docs.libp2p.io/concepts/circuit-relay/>. \[Accessed:
04-Oct-2022\]</span>

</div>

<div id="ref-petit-hugueninSessionTraversalUtilities2020"
class="csl-entry">

<span class="csl-left-margin">\[22\] </span><span
class="csl-right-inline">M. Petit-Huguenin, G. Salgueiro, J. Rosenberg,
D. Wing, R. Mahy, and P. Matthews, “Session Traversal Utilities for NAT
(STUN),” RFC Editor, RFC8489, Feb. 2020 \[Online\]. Available:
<https://www.rfc-editor.org/info/rfc8489>. \[Accessed:
04-Oct-2022\]</span>

</div>

<div id="ref-keranenInteractiveConnectivityEstablishment2018"
class="csl-entry">

<span class="csl-left-margin">\[23\] </span><span
class="csl-right-inline">A. Keranen, C. Holmberg, and J. Rosenberg,
“Interactive Connectivity Establishment (ICE): A Protocol for Network
Address Translator (NAT) Traversal,” RFC Editor, RFC8445, Jul. 2018
\[Online\]. Available: <https://www.rfc-editor.org/info/rfc8445>.
\[Accessed: 04-Oct-2022\]</span>

</div>

<div id="ref-ubertiWebRTCIPAddress" class="csl-entry">

<span class="csl-left-margin">\[24\] </span><span
class="csl-right-inline">J. Uberti and G. Shieh, “WebRTC IP Address
Handling Requirements,” Internet Engineering Task Force, Internet Draft
draft-ietf-rtcweb-ip-handling-09 \[Online\]. Available:
<https://datatracker.ietf.org/doc/draft-ietf-rtcweb-ip-handling-09>.
\[Accessed: 04-Oct-2022\]</span>

</div>

<div id="ref-libp2pStreamMultiplexing" class="csl-entry">

<span class="csl-left-margin">\[25\] </span><span
class="csl-right-inline">libp2p, “Stream Multiplexing.” \[Online\].
Available: <https://docs.libp2p.io/concepts/stream-multiplexing/>.
\[Accessed: 04-Oct-2022\]</span>

</div>

<div id="ref-rescorlaTransportLayerSecurity2018" class="csl-entry">

<span class="csl-left-margin">\[26\] </span><span
class="csl-right-inline">E. Rescorla, “The Transport Layer Security
(TLS) Protocol Version 1.3,” RFC Editor, RFC8446, Aug. 2018 \[Online\].
Available: <https://www.rfc-editor.org/info/rfc8446>. \[Accessed:
04-Oct-2022\]</span>

</div>

<div id="ref-perrinNoiseProtocolFramework2018" class="csl-entry">

<span class="csl-left-margin">\[27\] </span><span
class="csl-right-inline">T. Perrin, “The Noise protocol framework,”
*PowerPoint Presentation*, 2018. </span>

</div>

<div id="ref-Libp2p" class="csl-entry">

<span class="csl-left-margin">\[28\] </span><span
class="csl-right-inline">“Libp2p.” \[Online\]. Available:
<https://libp2p.io/>. \[Accessed: 04-Oct-2022\]</span>

</div>

</div>

[^1]: https://soroban.stellar.org
