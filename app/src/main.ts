import { BabyJubPoint, Proof, PubKey, PublicSignals } from "shared-crypto"
import { MessageBoard, VotingConfig } from "./messageboard";
import { generateSetOfNodes } from "./utils";
import _ from "lodash";
import { configs } from "./configs";

const start = new Date().getTime()

const prover = process.env.PROVER
console.log({ prover })

const nodeIndicies = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
for (let { name, guardianSets, tallers, config } of configs) {
    console.log(`================${name}=======================`)

    const localParties = generateSetOfNodes(config)
    const messageBoard = MessageBoard(config);

    if (config.sequential) {
        for (let [nodeIndex, guardiansIndexes] of guardianSets) {
            const node = localParties[nodeIndex as number - 1];
            const guardians = (guardiansIndexes as number[])
                .map((index) => localParties[index - 1].publicParty);
            if (config.skipProofs) {
                const { encryptedShares } = node.createSharesWithoutProofs(guardians);
                await messageBoard.contributeDkg(node.publicParty, encryptedShares, node.votingKeypair.pubKey)
            } else {
                const { proof, publicSignals, encryptedShares } = await node.createShares(guardians);
                await messageBoard.contributeDkg(node.publicParty, encryptedShares, node.votingKeypair.pubKey, proof, publicSignals)
            }
        }
    } else {
        // dkg
        await Promise.all(
            guardianSets.map(async ([nodeIndex, guardiansIndexes]) => {
                const node = localParties[nodeIndex as number - 1];
                const guardians = (guardiansIndexes as number[])
                    .map((index) => localParties[index - 1].publicParty);
                if (config.skipProofs) {
                    const { encryptedShares } = node.createSharesWithoutProofs(guardians);
                    await messageBoard.contributeDkg(node.publicParty, encryptedShares, node.votingKeypair.pubKey)
                } else {
                    const { proof, publicSignals, encryptedShares } = await node.createShares(guardians);
                    await messageBoard.contributeDkg(node.publicParty, encryptedShares, node.votingKeypair.pubKey, proof, publicSignals)
                }
            })
        )
    }

    // voting
    if (config.sequential) {
        for (let nodeIndex of nodeIndicies) {
            const node = localParties[nodeIndex - 1]
            const votingPubKey = messageBoard.votingPubKey()
            if (config.skipProofs) {
                const { C1, C2 } = node.prepareBallot(votingPubKey)
                await messageBoard.publishVote(node.publicParty, { C1, C2 })
            } else {
                const encryptedBallot = await node.createBallot(votingPubKey)
                await messageBoard.publishVote(node.publicParty, encryptedBallot)
            }
        }
    } else {
        await Promise.all(
            nodeIndicies.map(async (nodeIndex) => {
                const node = localParties[nodeIndex - 1]
                const votingPubKey = messageBoard.votingPubKey()
                if (config.skipProofs) {
                    const { C1, C2 } = node.prepareBallot(votingPubKey)
                    await messageBoard.publishVote(node.publicParty, { C1, C2 })
                } else {
                    const encryptedBallot = await node.createBallot(votingPubKey)
                    await messageBoard.publishVote(node.publicParty, encryptedBallot)
                }
            })
        )

    }

    // tally
    console.log({ tallers })

    if (config.sequential) {
        for (let nodeIndex of tallers) {
            const node = localParties[nodeIndex - 1]
            const C1 = messageBoard.aggregatedBallots()
            const shares = messageBoard.sharesFor(node.publicParty)
            console.log({ tallerIndex: nodeIndex, shares: shares.length })

            const partialDecryptions: {
                pd: BabyJubPoint,
                from: PubKey
                proof?: Proof,
                publicSignals?: PublicSignals,
            }[] = await node.partialDecryption(C1, shares, config)

            await messageBoard.publishPartialDecryption(node.publicParty, partialDecryptions)
        }
    } else {
        await Promise.all(
            tallers.map(async (nodeIndex) => {
                const node = localParties[nodeIndex - 1]
                const C1 = messageBoard.aggregatedBallots()
                const shares = messageBoard.sharesFor(node.publicParty)
                console.log({ tallerIndex: nodeIndex, shares: shares.length })

                const partialDecryptions: {
                    pd: BabyJubPoint,
                    from: PubKey
                    proof?: Proof,
                    publicSignals?: PublicSignals,
                }[] = await node.partialDecryption(C1, shares, config)

                await messageBoard.publishPartialDecryption(node.publicParty, partialDecryptions)
            })
        )

    }

    const results = messageBoard.offlineTally()
    console.log({ results })
    const end = new Date().getTime()
    const seconds = (end - start) / 1000
    console.log(`Simulation took ${seconds}s`)

}