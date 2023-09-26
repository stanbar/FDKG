import sizeof from "object-sizeof";
import { EncryptedShare, PublicParty } from "./party";
import { BabyJubPoint, Proof, PubKey, PublicSignals, decryptResults, inCurve, mulPointEscalar } from "shared-crypto";

export const broadcastContributeDkg = async (node: PublicParty, encryptedShares: EncryptedShare[], votingPublicKey: PubKey, proof?: Proof, publicSignals?: PublicSignals) => {
    console.log({ encryptedShares: sizeof({ encryptedShares, votingPublicKey, proof, publicSignals })})
}

export const broadcastPublishVote = async (node: PublicParty, encryptedBallot: { C1: BabyJubPoint, C2: BabyJubPoint, proof?: Proof, publicSignals?: PublicSignals }) => {
    console.log({ encryptedBallot: sizeof(encryptedBallot) })
}

export const broadcastPublishPartialDecryption = async (node: PublicParty, partialDecryption: {
    pd: BabyJubPoint,
    from: PubKey
    proof?: Proof,
    publicSignals?: PublicSignals,
}[]) => {
    console.log({ partialDecryption: sizeof(partialDecryption) })
}