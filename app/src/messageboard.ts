import { BabyJubPoint, Proof, PubKey, PublicSignals, addPoint, decryptResults, inCurve } from "shared-crypto";
import { EncryptedShare, PublicParty } from "./party";
import { verifyBallot, verifyPVSS, verifyPartialDecryption } from "./proofs";
import { PointZero } from "shared-crypto/src/F";
import assert from "node:assert";

export interface VotingConfig {
    size: number;
    options: number;
    guardiansSize: number;
    guardiansThreshold: number;
    skipProofs: boolean;
}

export function MessageBoard(config: VotingConfig) {
    const votingPublicKeys: BabyJubPoint[] = []
    const votes: { C1: BabyJubPoint, C2: BabyJubPoint }[] = []
    const sharesFrom: Map<PubKey, Array<EncryptedShare>> = new Map()
    const partialDecryptions: Array<BabyJubPoint> = []

    const votingPubKey = () => votingPublicKeys.reduce(addPoint, PointZero)

    const contributeDkg = async (node: PublicParty, proof: Proof, publicSignals: PublicSignals, encryptedShares: EncryptedShare[], votingPublicKey: PubKey) => {
        if (!config.skipProofs) {
            const valid = await verifyPVSS(proof, publicSignals)
            if (!valid) {
                throw new Error("Invalid proof")
            }
        }
        votingPublicKeys.push(votingPublicKey)
        sharesFrom.set(node.publicKey, encryptedShares)
        console.log(`contributed dkg from node ${node.index}`)
    }

    const publishVote = async (node: PublicParty, encryptedBallot: { C1: BabyJubPoint, C2: BabyJubPoint, proof: Proof, publicSignals: PublicSignals }) => {
        if (!config.skipProofs) {
            const valid = await verifyBallot(encryptedBallot.proof, encryptedBallot.publicSignals)
            if (!valid) {
                throw new Error("Invalid proof")
            }
        }
        votes.push({C1: encryptedBallot.C1, C2: encryptedBallot.C2})
        console.log(`published vote from node ${node.index}`)
    }

    const aggregatedBallots = () => votes.map(vote => vote.C1).reduce(addPoint, PointZero)

    const publishPartialDecryption = async (node: PublicParty, partialDecryption: {
        partialDecryption: BabyJubPoint,
        proof: Proof,
        publicSignals: PublicSignals,
    }[]) => {
        return Promise.all(partialDecryption.map(async (partialDecryption) => {
            if (!config.skipProofs) {
                const valid = await verifyPartialDecryption(partialDecryption.proof, partialDecryption.publicSignals)
                // TODO: add lagrange coefficient verification inside circuit
                if (!valid) {
                    throw new Error("Invalid proof")
                }
            }

            partialDecryptions.push(partialDecryption.partialDecryption)
            console.log(`published partial decryption from node ${node.index}`)
        }))
    }

    const sharesFor = (node: PublicParty): Array<EncryptedShare & { index: number, sharesSize: number }> => {
            const sharesForNode: Array<EncryptedShare & { index: number, sharesSize: number }> = []

            for (let [from, tos] of sharesFrom) {
                const index = tos.findIndex(to => to.guardianPubKey === node.publicKey)
                if (index != -1) {
                    sharesForNode.push({ index: index + 1, sharesSize: tos.length, ...tos[index] })
                }
            }
        return sharesForNode
    }

    const offlineTally = () => {
        console.log(`Collected ${partialDecryptions.length} partial decryptions and ${votes.length} votes`)
        const Z = partialDecryptions.reduce(addPoint, PointZero)
        assert(inCurve(Z))
        const C2 = votes.map(v => v.C2).reduce(addPoint, PointZero)
        assert(inCurve(C2))

        return decryptResults(Z, C2, config.size, config.options)
    }

    return {
        votingPubKey,
        contributeDkg,
        publishVote,
        publishPartialDecryption,
        aggregatedBallots,
        sharesFor,
        offlineTally
    }
}