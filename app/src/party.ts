import { BabyJubPoint, ElGamalCiphertext, encryptShare, genRandomSalt, Keypair, F, Proof, PublicSignals, PubKey, encryptBallot, mulPointEscalar, decryptShare, PrivKey, sss, fkdg } from "shared-crypto";
import { VotingConfig } from "./messageboard";
import { proveBallot, provePVSS, provePartialDecryption } from "./proofs";

export interface PublicParty {
    index: number;
    publicKey: BabyJubPoint;
    votingPublicKey: BabyJubPoint;
}
export interface EncryptedShare {
    guardianPubKey: PubKey;
    encryptedShare: ElGamalCiphertext;
}

export class LocalParty {
    readonly keypair: Keypair;
    readonly votingKeypair: Keypair;
    readonly polynomial: bigint[];
    readonly publicParty: PublicParty;
    readonly config: VotingConfig;

    constructor(index: number, keypair: Keypair, votingKeypair: Keypair, config: VotingConfig, coefficients?: bigint[]) {
        if (index <= 0) {
            throw new Error("Index must be greater than 0")
        }
        if (coefficients) {
            if (coefficients.length !== config.guardiansThreshold) {
                throw new Error("Coefficients must be of size guardiansThreshold")
            }
            if (coefficients[0] !== votingKeypair.privKey) {
                throw new Error("Coefficient[0] must be the voting private key")
            }
        }
        this.keypair = keypair;
        this.votingKeypair = votingKeypair;
        this.config = config;
        this.polynomial = coefficients ? coefficients : sss.randomPolynomialZ(config.guardiansThreshold, votingKeypair.privKey);
        this.publicParty = {
            index,
            publicKey: keypair.pubKey,
            votingPublicKey: votingKeypair.pubKey,
        }
    }


    createPlaintextShares(guardians: PublicParty[]): bigint[] {
        const shares = guardians.map((_, i) =>
            sss.evalPolynomialZ(this.polynomial, BigInt(i + 1))
        )
        return shares
    }
    createSharesWithoutProofs(guardians: PublicParty[]): { encryptedShares: EncryptedShare[], votingPublicKey: BabyJubPoint, r1: bigint[], r2: bigint[]} {
        const shares = this.createPlaintextShares(guardians)

        const r1 = guardians.map(genRandomSalt);
        const r2 = guardians.map(genRandomSalt);

        const encryptedShares = shares.map((share, i): EncryptedShare => {
            return {
                guardianPubKey: guardians[i].publicKey,
                encryptedShare: encryptShare(share, guardians[i].publicKey, r1[i], r2[i])
            }
        })
        return {encryptedShares, votingPublicKey: this.votingKeypair.pubKey, r1, r2 }
    }

    async createShares(guardians: PublicParty[]): Promise<{ proof: Proof, publicSignals: PublicSignals, encryptedShares: EncryptedShare[], votingPublicKey: BabyJubPoint }> {
        const { encryptedShares, votingPublicKey, r1, r2 } = this.createSharesWithoutProofs(guardians)

        const { proof, publicSignals } = await provePVSS(this.polynomial, r1, r2, guardians.map(g => g.publicKey))
        return { proof, publicSignals, encryptedShares, votingPublicKey }
    }

    prepareBallot(votingPublicKey: BabyJubPoint, r: PrivKey): { C1: BabyJubPoint, C2: BabyJubPoint, cast: number } {
        const cast = (this.publicParty.index % this.config.options) + 1
        const [C1, C2] = encryptBallot(votingPublicKey, BigInt(cast), r, this.config.size, this.config.options)
        return { C1, C2, cast }
    }

    async createBallot(votingPublicKey: BabyJubPoint): Promise<{ C1: BabyJubPoint, C2: BabyJubPoint, proof: Proof, publicSignals: PublicSignals }> {
        const r = genRandomSalt()
        const { C1, C2, cast } = this.prepareBallot(votingPublicKey, r)
        const { proof, publicSignals } = await proveBallot(votingPublicKey, BigInt(cast), r)
        return { C1, C2, proof, publicSignals }
    }

    partialDecryption(C1: BabyJubPoint, receivedShares: Array<EncryptedShare & { index: number, sharesSize: number }>): Promise<{ partialDecryption: BabyJubPoint, proof: Proof, publicSignals: PublicSignals }[]> {
        return Promise.all(receivedShares.map(async (s) => {
            const partialDecryption = this.partialDecryptionForEncryptedShare(C1, s)

            try {
                const { proof, publicSignals } = await provePartialDecryption(C1, s.encryptedShare.c1, s.encryptedShare.c2, s.encryptedShare.xIncrement, this.keypair.privKey)
                return { partialDecryption, proof, publicSignals }
            } catch (e) {
                console.error(`Failed to generate PartialDecryption proof for share[${s.index}]`, e)
                throw e;
            }
        }))
    }

    partialDecryptionForEncryptedShare(A: BabyJubPoint, s: EncryptedShare & { index: number, sharesSize: number }): BabyJubPoint {
        const share = decryptShare(this.keypair.privKey, s.encryptedShare)
        return this.partialDecryptionForShare(A, share, s.index, s.sharesSize)
    }

    partialDecryptionForShare(A: BabyJubPoint, s: bigint, shareIndex: number, sharesSize: number): BabyJubPoint {
        const shareWithLagrange = fkdg.shareWithLagrange({ share: s, shareIndex, sharesSize })
        return mulPointEscalar(A, shareWithLagrange)
    }

}