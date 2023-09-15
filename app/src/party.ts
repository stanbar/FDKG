import { BabyJubPoint, ElGamalCiphertext, encryptShare, evalPolynomial, genKeypair, genRandomSalt, randomPolynomial, Keypair, F, Proof, PublicSignals, PubKey, encryptBallot, decryptBallot, mulPointEscalar, SNARK_FIELD_SIZE, decryptShare } from "shared-crypto";
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

    constructor(index: number, keypair: Keypair, config: VotingConfig) {
        if (index <= 0) {
            throw new Error("Index must be greater than 0")
        }
        const votingKeypair = genKeypair();
        this.keypair = keypair;
        this.votingKeypair = votingKeypair;
        this.config = config;
        this.polynomial = randomPolynomial(config.guardiansThreshold, votingKeypair.privKey);
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

    async createBallot(votingPubKey: BabyJubPoint): Promise<{ C1: BabyJubPoint, C2: BabyJubPoint, proof: Proof, publicSignals: PublicSignals }> {
        const cast = BigInt((this.publicParty.index % this.config.options) + 1)
        const input = {
            votingPublicKey: votingPubKey,
            cast: cast,
            r: genRandomSalt(),
        }
        const [C1, C2] = encryptBallot(input.votingPublicKey, input.cast, input.r, this.config.size, this.config.options)

        const { proof, publicSignals } = await proveBallot(input.votingPublicKey, input.cast, input.r)
        return { C1, C2, proof, publicSignals }
    }

    async partialDecryption(A: BabyJubPoint, receivedShares: Array<EncryptedShare & { index: number, sharesSize: number }>): Promise<{ partialDecryption: BabyJubPoint, proof: Proof, publicSignals: PublicSignals }[]> {
        const lagrangeCoefficient = (index: number, sharesSize: number): Uint8Array => {
            const i = BigInt(index);
            let prod = F.e("1");
            for (let j = 1n; j <= sharesSize; j++) {
                if (i !== j) {
                    let nominator = F.e(j);
                    let denom = F.sub(F.e(j), F.e(i));

                    denom = F.inv(denom)
                    if (denom === null) {
                        throw new Error(`could not find inverse of denominator ${denom}`);
                    }
                    // 4. (X[i] - X[j]) * (1 / (X[i] - X[j])) = (val - X[j]) / (X[i] - X[j])
                    let numDenomInverse = F.mul(nominator, denom)

                    // 5. prod = prod * (val - X[j]) / (X[i] - X[j])
                    prod = F.mul(prod, numDenomInverse)
                }
            }
            return prod
        }

        return await Promise.all(receivedShares.map(async (s) => {
            const share = decryptShare(this.keypair.privKey, s.encryptedShare)
            const shareTimesLagrangeBasis = F.mul(lagrangeCoefficient(s.index, s.sharesSize), F.e(share))// TODO: decided where to put this computation, on the sender or receiver
            const partialDecryption = mulPointEscalar(A, F.toBigint(shareTimesLagrangeBasis))

            console.log(`Generating proof for share[${s.index}]`, { s, share, shareTimesLagrangeBasis: F.toBigint(shareTimesLagrangeBasis), partialDecryption: partialDecryption.map(F.toBigint) })
            try {
                const { proof, publicSignals } = await provePartialDecryption(A, s.encryptedShare.c1, s.encryptedShare.c2, s.encryptedShare.xIncrement, this.keypair.privKey)
                console.log(`Successfully generated PartialDecryption proof for share[${s.index}] = ${share}`)
                return { partialDecryption, proof, publicSignals }
            } catch (e) {
                console.error(`Failed to generate PartialDecryption proof for share[${s.index}] = ${share}`, e)
                throw e;
            }
        }))
    }
}