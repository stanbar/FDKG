import { BabyJubPoint, F, Proof, PubKey, PublicSignals, addPoint, decryptResults } from "shared-crypto";
import { EncryptedShare, LocalParty, PublicParty } from "./party";
import { verifyBallot, verifyPVSS } from "./proofs";

export interface VotingConfig {
    size: number;
    options: number;
    guardiansSize: number;
    guardiansThreshold: number;
}

export function MessageBoard(config: VotingConfig) {
    const votingPublicKeys: BabyJubPoint[] = []
    const votes: [BabyJubPoint, BabyJubPoint][] = []
    const sharesFrom: Map<PubKey, Array<EncryptedShare>> = new Map()
    const partialDecryptions: Array<BabyJubPoint> = []

    const votingPubKey = () => {
        return votingPublicKeys.slice(1).reduce((acc, key) => {
            return addPoint(acc, key)
        }, votingPublicKeys[0])
    }

    const contributeDkg = async (node: PublicParty, proof: Proof, publicSignals: PublicSignals, shares: EncryptedShare[], votingPublicKey: PubKey) => {
        const valid = await verifyPVSS(proof, publicSignals)
        if (!valid) {
            throw new Error("Invalid proof")
        }
        console.log(`contributed dkg from node ${node.index}`)
        votingPublicKeys.push(votingPublicKey)
        sharesFrom.set(node.publicKey, shares)
    }

    const publishVote = async (node: PublicParty, encryptedBallot: { C1: BabyJubPoint, C2: BabyJubPoint, proof: Proof, publicSignals: PublicSignals }) => {
        const valid = await verifyBallot(encryptedBallot.proof, encryptedBallot.publicSignals)
        if (!valid) {
            throw new Error("Invalid proof")
        }
        console.log(`published vote from node ${node.index}`)
        votes.push([encryptedBallot.C1, encryptedBallot.C2])
    }

    const aggregatedBallots = async (): Promise<BabyJubPoint> => {
        return votes.slice(1).map(vote => vote[0]).reduce((acc, vote) => {
            const sum = addPoint(acc, vote)
            return sum
        }, votes[0][0])
    }

    const publishPartialDecryption = async (node: PublicParty, partialDecryption: {
        partialDecryption: BabyJubPoint,
        proof: Proof,
        publicSignals: PublicSignals,
    }[]) => {
        console.log(`published partial decryption from node ${node.index}`)
        partialDecryption.forEach(async (partialDecryption) => {
            const valid = await verifyBallot(partialDecryption.proof, partialDecryption.publicSignals)
            if (!valid) {
                throw new Error("Invalid proof")
            }

            partialDecryptions.push(partialDecryption.partialDecryption)
        })
    }

    const sharesFor = (node: PublicParty): Array<EncryptedShare & { index: number, sharesSize: number }> => {
        const sharesForNode: Array<EncryptedShare & { index: number, sharesSize: number }> = []
        for (let [from, tos] of sharesFrom) {
            const index = tos.findIndex(to => to.guardianPubKey === node.publicKey)
            if (index != -1) {
                sharesForNode.push({ index : index + 1, sharesSize: tos.length, ...tos[index] })
            }
        }
        return sharesForNode
    }

    const offlineTally = () => {
        // TODO: test if it coffect
        const Z = partialDecryptions.slice(1).reduce((acc, partialDecryption) => {
            return addPoint(acc, partialDecryption)
        }, partialDecryptions[0])

        // TODO: test if it coffect
        const C2 = votes.slice(1).map(v => v[1]).reduce((acc, vote) => {
            return addPoint(acc, vote)
        }, votes[0][1])

        const [x_1, x_2, x_3, x_4] = decryptResults(Z, C2, config.size, config.options)
        return [x_1, x_2, x_3, x_4]
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