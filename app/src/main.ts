import { BabyJubPoint, Proof, PublicSignals, genKeypair } from "shared-crypto" 
import { MessageBoard, VotingConfig } from "./messageboard";
import { LocalParty } from "./party";
import _ from "lodash";

const generateSetOfNodes = (config: VotingConfig): LocalParty[] => {
    if (config.guardiansThreshold > config.size-1) {
        throw new Error("Guardians threshold must be less than size-1 otherwise it's impossible to reconstruct the secret")
    }
    const keypairs = Array.from({length: config.size}, (_, i) => genKeypair());
    const localParties = Array.from({ length: config.size }, (_, i) => { 
        return new LocalParty(i + 1, keypairs[i], config)
    } );
    return localParties
}

const config: VotingConfig  = {
    size: 10,
    options: 3,
    guardiansSize: 3,
    guardiansThreshold: 2,
}

const localParties = generateSetOfNodes(config)

const messageBoard = MessageBoard(config);

const nodeIndicies = [1,2,3,4,5,6,7,8,9,10]
const guardianSets = [
    [1, [1,2,3,6]],
    [4, [4,3,5,6]],
    [8, [8,5,6,7]],
    [10, [10,7,8,9]]
]

// dkg
for (let [nodeIndex, guardiansIndexes]  of guardianSets) {
    const node = localParties[nodeIndex as number - 1];
    const guardians = (guardiansIndexes as number[]).map((index) => localParties[index].publicParty);
    const { proof, publicSignals, encryptedShares } = await node.createShares(guardians);
    console.log({ proof, publicSignals, encryptedShares })
    messageBoard.contributeDkg(node, proof, publicSignals, encryptedShares, node.votingKeypair.pubKey)
}

// voting
for (let node of localParties) {
    const votingPubKey = messageBoard.votingPubKey()
    const encryptedBallot = await node.createBallot(votingPubKey)
    messageBoard.publishVote(encryptedBallot)
}

// tally
for (let nodeIndex of _.sampleSize(nodeIndicies, 6)) {
    const node = localParties[nodeIndex - 1]
    const A = await messageBoard.aggregatedBallots()
    const shares = messageBoard.sharesFor(node.publicParty)
    const partialDecryption: {
        partialDecryption: BabyJubPoint,
        proof: Proof,
        publicSignals: PublicSignals,
    }[] = await node.partialDecryption(A, shares)
    messageBoard.publishPartialDecryption(partialDecryption)
}

const results = messageBoard.offlineTally()
console.log({ results })