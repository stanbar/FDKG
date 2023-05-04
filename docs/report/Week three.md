Name: Stanislaw Baranski
Date: 13.02.2023

We were thinking of three use cases: housing associations/communities, university voting, and boardroom voting. These are all small-scale voting, with weaker security requirements. In fact, all those use cases would be reduced to **boardroom voting** because people eligible to vote at those organisations are usually some stakeholders. 

Initially, we compared our system to blockchain-based solutions like [Polys](https://polys.vote/whitepaper), [Voatz](https://voatz.com), [MACI](https://github.com/privacy-scaling-explorations/maci), or [OpenVoteNetwork](https://github.com/stonecoldpat/anonymousvoting).

Our advantage would be

- threshold decryption; we can still decrypt if some people don’t participate,
- it would be free because we use a private p2p blockchain.

However, the same properties can be achieved using systems like Helios or [ElectionGuard](http://www.electionguard.vote/overview/Features/) (Josh Benaloh). These systems are not fully decentralised as they are based on a set of trusted entities called Guardians. However, we feel that **people don’t care that much about decentralisation**. Sometimes (or even most of the time) they may prefer to trust a set of authorities rather than unknown miners. Therefore we may not bring that much value.

Yet, we believe that there is value in a free p2p voting system (similar to p2p currencies). We find it hard to imagine a concrete scenario where p2p would be the killer feature, but democratic systems, the whole Web 3.0 movement, smart cities, or crypto cities, seem to perfectly fit with the p2p voting system. 

Compared to other public-blockchain-based solutions, we are free, which is arguably a big deal—paying for a vote must reduce the turnout.

Compared to private-blockchain-based solutions or ElectionGuard-like systems, in our system, there is no need to run the software on any centralised server(s), which is also arguably a big deal, especially in the case of small, informal voting. Someone has to run this server. For larger organisations like universities, it’s not a problem as an IT department is responsible for hosting it. But for small organizations, it can be a problem. For example, small informal teams, NGOs, open-source projects, student projects, start-up teams, student communities, boardrooms, housing associations, or even teams like Delendum. Running the software in a SaaS model, brings us back to the question of "who runs the message board and tallying software and can we trust them?" or even "who pays for it?".

In our solution, voters are running the software, so the question of “who runs the message board and tallying software and can we trust them?” changes to “do we trust that the majority (more concretely m-of-n voters) are honest?” Moreover, as the network is private p2p there is no problem of "who pays for it?". And because it's a private blockchain there are no transaction fees.

---

Below is a comparison table.

| Property/System using  | Trusted server/BC(s) (Polys or ElectionGuard) | Public blockchain | voter2voter network |
| ---------------------- | --------------------------------------------- | ----------------- | ------------------- |
| Transaction fees       | No 🌕                                         | Yes 🌑            | No 🌕               |
| Running software costs | Yes 🌑                                        | No  🌕            | No 🌕               |
| Trust to [^trust]      | Authorities [^authorities]  🌔                | Miners  🌖        | Voters  🌗          |

[^trust]: Trust is a broad term that refers to different properties of the system, but most of the time it answers the question of who holds the properties of censorship-resistance, privacy, and/or correctness.
[^authorities]: Examples of authorities are: "Election Officials, Trustees Canvass Board Members, Government Officials or other trusted authorities who are responsible and accountable for conducting the election", [source](http://www.electionguard.vote/basics/steps/1_Key_Ceremony/).


So it looks like the niche where we can do the best is small informal organizations that do not run voting frequently and do not want to pay for SaaS or for transaction fees or do not have technical skills or time to host the software themselves.


Is it reasonable, compelling, usefull enough? How can we improve?