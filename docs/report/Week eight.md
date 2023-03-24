Name: Stanislaw Baranski
Date: 17.03.2023

# Results
%%Insert a summary of the results obtained from the research%%
This week we:
- Wrote down a formal description of the [protocol](https://github.com/delendum-xyz/private-voting/blob/main/docs/Protocol.md)
- Researched blockchain platforms
	- in-browser Substrate https://forum.polkadot.network/t/full-node-in-browser/2185 
 
# Challenges

We know how to do dynamic synchronous (all nodes online) DKG.

But we don't know how to do asynchronous (every node sends only one message) dynamic DKG.

We want a party to send a message, which becomes a share of a secret key. SSS requires specifying the degree of a polynomial at the time of constructing a share. We want the degree to increase every time someone participate.

# Resources

Docs: [delendum-xyz/private-voting](https://github.com/delendum-xyz/private-voting/tree/main/docs)