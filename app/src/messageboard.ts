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
        return votingPublicKeys.reduce((acc, key) => {
            return addPoint(acc, key)
        }, [F.e("0"), F.e("0")])
    }

    const contributeDkg = async (node: LocalParty, proof: Proof, publicSignals: PublicSignals, shares: EncryptedShare[], votingPublicKey: PubKey) => {
        const valid = await verifyPVSS(proof, publicSignals)
        if (!valid) {
            throw new Error("Invalid proof")
        }
        votingPublicKeys.push(votingPublicKey)
        sharesFrom.set(node.publicParty.publicKey, shares)
    }

    const publishVote = async (encryptedBallot: { C1: BabyJubPoint, C2: BabyJubPoint, proof: Proof, publicSignals: PublicSignals }) => {
        const valid = await verifyBallot(encryptedBallot.proof, encryptedBallot.publicSignals)
        if (!valid) {
            throw new Error("Invalid proof")
        }
        votes.push([encryptedBallot.C1, encryptedBallot.C2])
    }

    const aggregatedBallots = async (): Promise<BabyJubPoint> => {
        return votes.map(vote => vote[0]).reduce((acc, vote) => {
            return addPoint(acc, vote)
        }, [F.e("0"), F.e("0")])
    }

    const publishPartialDecryption = async (partialDecryption: {
        partialDecryption: BabyJubPoint,
        proof: Proof,
        publicSignals: PublicSignals,
    }[]) => {
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
                sharesForNode.push({ index, sharesSize: tos.length, ...tos[index] })
            }
        }
        return sharesForNode
    }

    const offlineTally = () => {
        // TODO: test if it coffect
        const Z = partialDecryptions.reduce((acc, partialDecryption) => {
            return addPoint(acc, partialDecryption)
        }, [F.e("0"), F.e("0")])

        // TODO: test if it coffect
        const C2 = votes.map(v => v[1]).reduce((acc, vote) => {
            return addPoint(acc, vote)
        }, [F.e("0"), F.e("0")])

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