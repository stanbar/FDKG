import { BabyJubPoint, ElGamalCiphertext, encryptShare, genRandomSalt, Keypair, F, Proof, PublicSignals, PubKey, encryptBallot, mulPointEscalar, decryptShare, PrivKey } from "shared-crypto";
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
            if (coefficients[0] !== BigInt(keypair.privKey)) {
                throw new Error("Coefficients must start with the secret")
            }
        }
        this.keypair = keypair;
        this.votingKeypair = votingKeypair;
        this.config = config;
        this.polynomial = coefficients ? coefficients : randomPolynomial(config.guardiansThreshold, votingKeypair.privKey);
        this.publicParty = {
            index,
            publicKey: keypair.pubKey,
            votingPublicKey: votingKeypair.pubKey,
        }
    }


    async createShares(guardians: PublicParty[]): Promise<{ proof: Proof, publicSignals: PublicSignals, encryptedShares: EncryptedShare[], votingPublicKey: BabyJubPoint }> {
        const r1 = guardians.map((_) => genRandomSalt());
        const r2 = guardians.map((_) => genRandomSalt());

        const shares = guardians.map((_, i) => {
            const share = evalPolynomial(this.polynomial, BigInt(i + 1))
            return share
        })
        const encryptedShares = shares.map((share, i): EncryptedShare => {
            return { guardianPubKey: guardians[i].publicKey, encryptedShare: encryptShare(share, guardians[i].publicKey, r1[i], r2[i]) }
        })

        const { proof, publicSignals } = await provePVSS(this.polynomial, r1, r2, guardians.map(g => g.publicKey))
        return { proof, publicSignals, encryptedShares, votingPublicKey: this.votingKeypair.pubKey }
    }

    prepareBallot(votingPublicKey: BabyJubPoint, r: PrivKey): { C1: BabyJubPoint, C2: BabyJubPoint, cast: number } {
        const cast = (this.publicParty.index % this.config.options) + 1
        const [C1, C2] = encryptBallot(votingPublicKey, BigInt(cast), r, this.config.size, this.config.options)
        return {C1, C2, cast}
    }

    async createBallot(votingPublicKey: BabyJubPoint): Promise<{ C1: BabyJubPoint, C2: BabyJubPoint, proof: Proof, publicSignals: PublicSignals }> {
        const r = genRandomSalt()
        const { C1, C2, cast } = this.prepareBallot(votingPublicKey, r)
        const { proof, publicSignals } = await proveBallot(votingPublicKey, BigInt(cast), r)
        return { C1, C2, proof, publicSignals }
    }

    partialDecryptionForEncryptedShare(A: BabyJubPoint, s: EncryptedShare & { index: number, sharesSize: number }): BabyJubPoint {
            const share = decryptShare(this.keypair.privKey, s.encryptedShare)
            return this.partialDecryptionForShare(A, share, s.index, s.sharesSize)
    }

    partialDecryptionForShare(A: BabyJubPoint, s: bigint, shareIndex: number, shareSize: number): BabyJubPoint {
        const lagrangeBasis = lagrangeCoefficient(shareIndex, shareSize)
            const shareTimesLagrangeBasis = Z.mul(lagrangeBasis, F.fromBigint(s))// TODO: decided where to put this computation, on the sender or receiver
            const partialDecryption = mulPointEscalar(A, F.toBigint(shareTimesLagrangeBasis))
            return partialDecryption
    }

    async partialDecryption(A: BabyJubPoint, receivedShares: Array<EncryptedShare & { index: number, sharesSize: number }>): Promise<{ partialDecryption: BabyJubPoint, proof: Proof, publicSignals: PublicSignals }[]> {
        return await Promise.all(receivedShares.map(async (s) => {
            const partialDecryption = this.partialDecryptionForEncryptedShare(A, s)

            try {
                const { proof, publicSignals } = await provePartialDecryption(A, s.encryptedShare.c1, s.encryptedShare.c2, s.encryptedShare.xIncrement, this.keypair.privKey)
                return { partialDecryption, proof, publicSignals }
            } catch (e) {
                console.error(`Failed to generate PartialDecryption proof for share[${s.index}]`, e)
                throw e;
            }
        }))
    }
}

function lagrangeCoefficient(shareIndex: number, shareSize: number) {
    throw new Error("Function not implemented.");
}
