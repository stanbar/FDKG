import { BabyJubPoint, Proof, PublicSignals } from "shared-crypto"
import { MessageBoard, VotingConfig } from "./messageboard";
import { generateSetOfNodes } from "./utils";
import _ from "lodash";

const nodeIndicies = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const guardianSets = [
    [1, [1, 2, 3, 6]],
    [4, [4, 3, 5, 6]],
    [8, [8, 5, 6, 7]],
    [10, [10, 7, 8, 9]]
]
const config: VotingConfig = {
    size: nodeIndicies.length,
    options: 4,
    guardiansSize: 4,
    guardiansThreshold: 3,
    skipProofs: false,
}

const localParties = generateSetOfNodes(config)
const messageBoard = MessageBoard(config);

// dkg
await Promise.all(
    guardianSets.map(async ([nodeIndex, guardiansIndexes]) => {
        const node = localParties[nodeIndex as number - 1];
        const guardians = (guardiansIndexes as number[])
            .map((index) => localParties[index - 1].publicParty);
        const { proof, publicSignals, encryptedShares } = await node.createShares(guardians);

        await messageBoard.contributeDkg(node.publicParty, proof, publicSignals, encryptedShares, node.votingKeypair.pubKey)
    })
)

// voting
await Promise.all(
    nodeIndicies.map(async (nodeIndex) => {
        const node = localParties[nodeIndex - 1]
        const votingPubKey = messageBoard.votingPubKey()
        const encryptedBallot = await node.createBallot(votingPubKey)
        await messageBoard.publishVote(node.publicParty, encryptedBallot)
    })
)

// tally
const tallers = _.sampleSize(nodeIndicies, 10)
console.log({ tallers })

await Promise.all(
    tallers.map(async (nodeIndex) => {
        const node = localParties[nodeIndex - 1]
        const C1 = messageBoard.aggregatedBallots()
        const shares = messageBoard.sharesFor(node.publicParty)
        console.log({ tallerIndex: nodeIndex, shares: shares.length })

        const partialDecryption: {
            partialDecryption: BabyJubPoint,
            proof: Proof,
            publicSignals: PublicSignals,
        }[] = await node.partialDecryption(C1, shares)

        await messageBoard.publishPartialDecryption(node.publicParty, partialDecryption)
    })
)

const results = messageBoard.offlineTally()
console.log({ results })