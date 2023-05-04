From: 
Berty protocol, also called Wesh protocol provides secure communication between 
- multiple accounts in one-to-one conversations;
- multicast communications in group conversations;
- devices owned by the same account.

Berty protocol achieves this in a distributed and asynchronous way. It works with and without an internet connection, via the usage of IPFS and BLE. Also it provides end-to-end encryption, so every channel is encrypted and authenticated.

Berty protocol relies heavily on IPFS for storing and sharing messages in a distributed system.
IPFS:
- Each peer has an indentity key pair.
- Each peer identifies itself using a peerID (a hash of its identity public key).
- Each content is identified using a contentID (a hash of the content).
- A peer can make a locally stored content available on the network, announcing that a given contentID is provided by its peerID, so other peers can connect to it and fetch the content.
- Once a peer has fetched the content over IPFS, it can also become a provider fo this content, thus increasing its availability.
- To make it all work, IPFS uses the libp2p network stack which provides everything that is needed to create a p2p application: DHT, PubSub, NAT Traversal, a collection of transports, etc.


Berty protocol uses a combination of TOTP and a public key to generate rendezvous point addresses and register its users on IPFS, who can later be contacted by peers wishing to communicate.

As it gives a lot of featurs, it brings several technical constraints:
- **Content availability**: since there is no central storage, all the messages are stored on the users devices and it is impossible to access content stored on a device that is offline or unreachable from a given network.
- **Asynchrony**: there is no central server to rule over the timeline, and therefore timestamps cannot be used for any purpose other than non-critical tasks like displying messages in a certain order. For example: expiration time cannot be used to revoke access to a resource, it is impossible to determine with certainity the order in which operations occurred within a group of peers, etc.
- **Authority**, there is no central authority to arbitrate operations and any resulting conflicts or to manage user identity and permissions.

Those are problematic issues as we don't want to allow anyone to vote twice.

---
# Side note on FLP Impossiblity Proof 

In asynchronious decentralised systems a consensus mechanism can prefer at most two of three properties:
- Fault tollerance, system can survive a failure of a validator at any point, many consensus protocols chose this one over the others. 
- Safety, guarantee that something bad won't happen. For example, if a network can not agree on a ledger, it will not fork into two versions. The network will rather halt and wait until it solves the problem manually. 
- Liveness, guarantee that something good will happen. That good is ledgers closing. This means that network will always close a ledger and be alive, and accepting future transactions. This means that the validators may diverge on different ledgers, causing accidental forks and double-spendings. 

It's proven by FLP Impossiblity Proof that we can achieve at most two of three properties. So we have to chose which of the options we want to forego.

PoW liveness > safety. 
Stellar safety > liveness.

This is what blockchain solves. It would be nice to see how IOTA solves it as well.

---

## Rendezvous Point

A rendezvous point is a volatile address on a peer-to-peer network where two devices can meet.

A rendezvous point is a address which peers can use to register their peerID and get the list of already registered peers. 

In this way peers can connect together to exchange messages.

Peers need to be able to generate on their own, the same address for a given rendezvous.

In the Wesh protocol, the address of a rendezvous poin is generated from two values.
- A resource ID
- A time-based token generated from a 32-byte seed.

The protocol relies on three different rendezvous point systems:
- **DHT-based**: fully distributed, virtually impossible to shutdown, can operate without internet access but can be slow, especially for mobile usage.
- **Decentralized servers**: not p2p/distributed, can not be reached offline, but is a lot faster.
- **Local record**: used in combination with direct transports such as Bluetooth Low Energy. To make it simple, it consists of a process where a peer is sending its rendezvous point list to the peers it connects to via a direct transport. The advantage is that it works in this particular case with alsmost instantaneous results. The issue is with privacy concerns.

### Direct Transport

When there is no internet access it is still possible to communicate using direct transports, given some physical constraints of distance. 
Those transports integrate directly with IPFS and more precisely with its network layer: libp2p.

Those direct transports are build on top of Android Nearby for Android devices, Multipeer Connectivity for iOS, and BLE for inter-OS communications. Using Android Nearby and Multipeer Connectivity they can use WiFi, BLE otherwise.

Using those Direct transports, it's possible to use Wesh protocol without ever reaching internet connection.

### Conflict-free Replicated Data Type

Since the network is asynchronious, it works both online and offline, there is a need for achieving coherence and order between all the messages.

For example, Alice and Bob, being part of a group, can lose internet connection and still chat creating a parallel version of this conversation. The goal is to make them synchronize (merge) with the rest of the network once they connect back. 

The solution to this problem is Conflict-free Replicated Data Type (CRDT), which is a data structure allowing a consistent ordering of the messages on a distrivuted system. Wesh relies on OrbitDB which implements CRDT. The CRDT provides **optimistic** replication and **strong eventual consistency**, which assures that once synchronized every peer will have the same version of the message list.


### Account creation

All key-paris are X25519 for encryption and Ed25519 for signatures.
Account creation steps:
- Generate Account ID Key Pair. Once per account.
- Generate Alias Key Pair.
- Generate Device ID Key Pair on device used for account creation.  Once per device, multiple times per account.
- Generate Public RDV Seed. It is used to generate an RDV Point to receive a Contact Request. Can be repeated anytime. 

### Adding Contacts
If an account A want's to start a one-to-one conversation with an Account B, it have to add B as a contract first. A will have to send a contact request to B that B will have to accept before the conversation can begin.

#### Contact Request
When an Account A (the Requester) wants to add an Account B (the Responder) to its contacts, it needs to know the Responder's Public rendezvouz point. This rendezvous point is derived from the RDV Seed and the Account Id. Thus the Responder first needs to share his RDV Seed and his Account ID with the Requester, so that the latter can compute the RDV Point. This information can be sent by different means: an URL sent by message, a QRCode displyed on the Responder's device and scanned by the Requester's smartphone, etc.

The Responder can renew their RDV Seed at any time. If it does so, the Requester will not be able to send a contact request anymore unless the Responder shares its new RDV Seed.

##  Groups

A group is a logical structure in which members connect to exchange messages and metadata. 
Metadata include e.g. logs that a new member joined the network, or to exchange the keys.
Messages and nets data are exchanged through two immutable logs provided by OrbitDB.

Structure: 
A group consists of two logs:
1. **Messages log**, contains all the messages need within the group. Members can download only a part of the message log. Moreover, new members can not decrypt messages sent before they joined the group because of the Symmetric Ratchet Protocol.
2. **Metadata logs**, contains all the metadata of the group. Since it contains essential information, members of the group shall download the whole metadata log.


### Types of Groups

There are three types of groups in Wesh: 
1) Account Group, is the group of all devices linked to the same Account. 
2) Contact Group, is a group consisting of exactly two Group Members who are Contacts. When an Account adds another account as a contact, the Contact Group is created. 
3) Multi-Member Group, is a group of several Group Members who may or may not be Contacts. Each Account can use random Member ID and random device ID.

A Group Member is a Wesh user (an account) in a Group.

## Messages

### Encryption

In the Wesh protocol, all communication are fully end-to-end encrypted using Symmetric-key Ratchet. **Every time a user wants to send a message to someone, a Message Key is derived from their Chain Key using HKDF**. The HKDF also updates the Chain Key after each derivation. The Message Key is then used to encrypt the message and will not be reused to encrypt other messages.

**The Message Key is one key per one message.**


### Joining a Group

To communicate with other devices (or users), a device (or a user) has to join a group. A device (or a user) can only join a group if it is in possession of an invitation.

#### Invitation

An invitation is composed of the Group ID, the Group Secret, the Group Secret Sig and the Attachment Key. An invitation can thus be created by any member of the Group. With the invitation, a Wesh user can compute the Rendezvous Point of the Group, which is derived from the Group ID.

## High Availability

Since there is no central server in the Wash protocol, messages and files are only stored on users devices. Thus, if a certain device has some information and is offline, other devices will not be able to get this information. For example, if a user adds a contact with its device A, and turns device A offline and the uses device B, device B will not be aware of this new contact and will not be able to communicate with it.

To palliate this problem and provide high availability, the user can set up a dedicated device with one of the following configurations: bot account, linked device, replication device and replication server.

There are number of different techniques to solve the issue:
1. **Bot account** is an account that was created on a dedicated device and added to the user account as a contact. The user will have to manually add the bot contact into all its multi-memeber groups. The bot is standard account so it can send and read messages. The limitation is that it can only be added to multi-member groups, not Contact groups.
2. **Linked device**, is normal device linked to an account. It has the same capabilities as normal account-devices. So it can read and write messages. It provide high availability for every grop the account belongs to.
3. **Replication device**, a replication device is a dedicated device which is linked to an account but does not get any access. It can only store messages and verify their authenticity.
4. **Replication server**, a replication server is basically a replication device that s not linked to a user account but instead is owned and made available by a third party. Anybody can add an existing replication server to a Group (via API) to provide high availability.

