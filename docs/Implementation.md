There are a few approaches to implement our protocol.

1. From strach, using libp2p. Costly, a lot of work.
2. Tendermint. Also a lot of work.
3. Bertity, it is an instant messaging app, which works similar to our usecase. We could implement our voting protocol directly on top of it, without any interventions into the codebase. 
	1. Everyone interesting in voting downloads an app and create an account (key-pair), shares the public key with the organisers.
	2. Host of an election creates a group with all the participants included. 
	3. Everyone interested in participation can pick a set of participants they trust, create a secret, share it, and send the shares to each of them over a private channel. Then send a proof to the group. 
	4. Berty uses Orbit-DB, we would have to use Proof-of-Authority based on the guardian set.

Peer-to-peer protocols are great in theory, but in practice, they struggle with the imperfect reality of environment limitations, unsupported protocols, unaccessible peers,  firewalls, and NATs.

Fortunately, the development of Blockchain technologies pushed the development on all layers including the networking layer. 

Libp2p is a project easing the process of building decentralised applications, including blockchain.

Libp2p allows for implementation of the 



1. Node starts a voting
2. It runs AutoNAT to determine whether it's public or private node
	1. Public node, it just announce its address to everyone, becoming a relay to other nodes to the network
	2. Private node, it has to use public relay.
3. If it is a public node
