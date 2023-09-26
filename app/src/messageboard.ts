import { BabyJubPoint, Proof, PubKey, PublicSignals, addPoint, decryptResults, inCurve, mulPointEscalar } from "shared-crypto";
import { EncryptedShare, PublicParty } from "./party";
import { verifyBallot, verifyPVSS, verifyPartialDecryption } from "./proofs";
import { PointZero } from "shared-crypto/src/F";
import assert from "node:assert";
import { LagrangeCoefficient } from "shared-crypto/src/sss";

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
    const sharesFrom: Map<PubKey, Array<EncryptedShare & { index: number, sharesSize: number }>> = new Map()
    const partialDecryptions: Array<BabyJubPoint> = []
    const partialDecryptionFor: Map<PubKey, Array<{ senderPubKey: PubKey, pd: BabyJubPoint }>> = new Map()

    const votingPubKey = () => votingPublicKeys.reduce(addPoint, PointZero)

    const contributeDkg = async (node: PublicParty, encryptedShares: EncryptedShare[], votingPublicKey: PubKey, proof?: Proof, publicSignals?: PublicSignals) => {
        if (!config.skipProofs && proof && publicSignals) {
            const valid = await verifyPVSS(proof, publicSignals, config.guardiansThreshold, config.guardiansSize)
            if (!valid) {
                throw new Error("Invalid proof")
            }
        }
        votingPublicKeys.push(votingPublicKey)
        sharesFrom.set(node.publicKey, encryptedShares.map((encryptedShare, i) => ({ ...encryptedShare, index: i, sharesSize: encryptedShares.length })))
        console.log(`contributed dkg from node ${node.index}`)
    }

    const publishVote = async (node: PublicParty, encryptedBallot: { C1: BabyJubPoint, C2: BabyJubPoint, proof?: Proof, publicSignals?: PublicSignals }) => {
        if (!config.skipProofs && encryptedBallot.proof && encryptedBallot.publicSignals) {
            const valid = await verifyBallot(encryptedBallot.proof, encryptedBallot.publicSignals)
            if (!valid) {
                throw new Error("Invalid proof")
            }
        }
        votes.push({ C1: encryptedBallot.C1, C2: encryptedBallot.C2 })
        console.log(`published vote from node ${node.index}`)
    }

    const aggregatedBallots = () => votes.map(vote => vote.C1).reduce(addPoint, PointZero)

    const publishPartialDecryption = async (node: PublicParty, partialDecryption: {
        pd: BabyJubPoint,
        from: PubKey
        proof?: Proof,
        publicSignals?: PublicSignals,
    }[]) => {
        return Promise.all(partialDecryption.map(async (pd) => {
            if (!config.skipProofs && pd.proof && pd.publicSignals) {
                const valid = await verifyPartialDecryption(pd.proof, pd.publicSignals)
                // TODO: add lagrange coefficient verification inside circuit
                if (!valid) {
                    throw new Error("Invalid proof")
                }
            }

            partialDecryptionFor.has(pd.from) ?
                partialDecryptionFor.get(pd.from)?.push({ senderPubKey: node.publicKey, pd: pd.pd }) :
                partialDecryptionFor.set(pd.from, [{ senderPubKey: node.publicKey, pd: pd.pd }])
            console.log(`published partial decryption from node ${node.index}`)
        }))
    }

    const sharesFor = (node: PublicParty): Array<{ share: EncryptedShare, from: PubKey }> => {
        const shares: Array<{ share: EncryptedShare, from: PubKey }> = []
        for (let [from, tos] of sharesFrom) {
            const index = tos.findIndex(to => to.guardianPubKey === node.publicKey)
            if (index != -1) {
                const share = tos[index]
                shares.push({ share, from })
            }
        }
        return shares
    }

    const offlineTally = () => {
        for (let [from, pds] of partialDecryptionFor) {
            // nodes of participants
            const nodes: { pd: BabyJubPoint, shareIndex: number }[] = []
            for (let { senderPubKey, pd } of pds) {
                const shareIndex = sharesFrom.get(from)?.findIndex(share => share.guardianPubKey === senderPubKey)
                if (shareIndex == undefined) {
                    throw new Error("Partial decryption for share of party that did not contribute to dkg")
                }
                if (shareIndex == -1) {
                    throw new Error("Partial decryption from node that didn't received the share")
                }
                nodes.push({ pd, shareIndex: shareIndex + 1 })
            }

            const partialDecryption = nodes.reduce((acc, { pd, shareIndex }) => {
                const lagrangeCoeff = LagrangeCoefficient(shareIndex, nodes.map(n => n.shareIndex ))
                return addPoint(acc, mulPointEscalar(pd, lagrangeCoeff))
            }, PointZero)
            partialDecryptions.push(partialDecryption)
        }
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