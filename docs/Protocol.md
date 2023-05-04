Our protocol consists of three layers:
1. Application/Voting layer [[Federated Protocol]]
	1. All nodes can vote
	2. Privacy property is achieved assuming the majority of GS is honest.
2. Consensus layer  [[@kleppmannMakingCRDTsByzantine2022]]
	1. We don't need strong consistency. Eventual consistency is fine. In fact, we need only three rounds of synchronisation.
		1. At the end of DKG. 
		2. At the end of voting.
		3. At the end of tallying.
	3. Only peers in Guardian Set are allowed to participate in the consensus algorithm.
4. Networking layer [[Wesh protocol]]

Since we want our network to be p2p, we assume 
