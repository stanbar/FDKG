import sizeof from "object-sizeof";
import { EncryptedShare, PublicParty } from "./party";
import { BabyJubPoint, Proof, PubKey, PublicSignals } from "shared-crypto";

import ffi from 'ffi-napi';
import ref from 'ref-napi';

// Define the types and functions from the shared library
const libweshnet = ffi.Library('libweshnet.so.dylib', {
    'NewPersistentServiceClient': ['void', ['string']],  // replace with actual function signature
    // Add other functions as needed
});

if (process.env.WESHNET) {
    // Call the function
    libweshnet.NewPersistentServiceClient("data1");
}

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