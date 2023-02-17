Name: Stanislaw Baranski
Date: 17.02.2023

# Results
%%Insert a summary of the results obtained from the research%%
This week we:
- Specified the use case: small-scale voting for informal organizations like small teams, NGOs, open-source projects, student projects, start-up teams, student communities, boardrooms, and housing associations. They do not run voting frequently and may not want to pay for SaaS or transaction fees, or do not have the technical skills or time to host the software themselves.
- We researched the possibility of in-browser p2p networking ([ironfish](https://github.com/iron-fish/ironfish/discussions/3323), [libp2p](https://discuss.libp2p.io/t/implementing-simple-p2p-in-browser-blockchain-using-libp2p/1810))
	- We can not use TCP sockets, we need to use WebRTC data channels. [Source](https://github.com/iron-fish/ironfish/discussions/3323)
	- WebRTC is not implemented yet in libp2p-js. [Source](https://discuss.libp2p.io/t/implementing-simple-p2p-in-browser-blockchain-using-libp2p/1810/2) 
	- We can either try to implement it without WebRTC or start with go/rust CLI implementation.
- We wanted to run the blockchain on voter-2-voter network (so each voter is a full node), however voting should last at least 24 hours and we cannot expect voters to have their nodes online for the whole time. It's an impractical assumption. They should be able to join, submit, and leave. 
-  Updated the [Development roadmap](https://github.com/delendum-xyz/private-voting/blob/main/docs/Development.md).

# Challenges

We are looking for a dynamic and asynchronous DKG procedure which can work with an unknown number of parties.
We assume a short-term phase (aka. trusted ceremony), where people can participate in the DKG. But we don't know who will participate. So the number of participants k is bounded (number of all eligible participants) but unknown. 

We are not sure how to do it.

Shashank suggested to took at [YOSO: You Only Speak Once / Secure MPC with Stateless Ephemeral Roles](https://eprint.iacr.org/2021/210)


# Learning Resources
%%Insert the material or notes that you would like to share with the community%%
Docs: [delendum-xyz/private-voting](https://github.com/delendum-xyz/private-voting/tree/main/docs)

- [Code a simple P2P blockchain in Go](https://mycoralhealth.medium.com/code-a-simple-p2p-blockchain-in-go-46662601f417)
- [Blockchain networking](https://mycoralhealth.medium.com/part-2-networking-code-your-own-blockchain-in-less-than-200-lines-of-go-17fe1dad46e1)
- [Implementing simple p2p in-browser blockchain using libp2p](https://discuss.libp2p.io/t/implementing-simple-p2p-in-browser-blockchain-using-libp2p/1810)
- [Iron fish networking docs](https://ironfish.network/docs/whitepaper/2_networking)
- [Ironfish networking browser support](https://github.com/iron-fish/ironfish/discussions/3323)
- [[@piscosSecureMultipartyComputation2015]]