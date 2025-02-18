import { BabyJubPoint, Share, ElGamalCiphertext, encryptShare, genRandomSalt, Keypair, F, Proof, PublicSignals, PubKey, encryptBallot, mulPointEscalar, decryptShare, PrivKey, sss, fkdg } from 'shared-crypto'
import { proveBallot, provePVSS, provePartialDecryption } from './proofs.js'
import { VotingConfig } from './configs.js'

export interface PublicParty {
  index: number
  publicKey: BabyJubPoint
  votingPublicKey: BabyJubPoint
}
export interface EncryptedShare extends Omit<Share, 'y'> {
  guardianPubKey: PubKey
  encryptedShare: ElGamalCiphertext
}
export interface CollectedEncryptedShare extends EncryptedShare {
  nodes: number[]
}

export class LocalParty {
  readonly keypair: Keypair
  readonly votingKeypair: Keypair
  readonly polynomial: bigint[]
  readonly publicParty: PublicParty
  readonly config: VotingConfig

  constructor (index: number, keypair: Keypair, votingKeypair: Keypair, config: VotingConfig, coefficients?: bigint[]) {
    if (index <= 0) {
      throw new Error('Index must be greater than 0')
    }
    if (coefficients != null) {
      if (coefficients.length !== config.guardiansThreshold) {
        throw new Error('Coefficients must be of size guardiansThreshold')
      }
      if (coefficients[0] !== votingKeypair.privKey) {
        throw new Error('Coefficient[0] must be the voting private key')
      }
    }
    this.keypair = keypair
    this.votingKeypair = votingKeypair
    this.config = config
    this.polynomial = (coefficients != null) ? coefficients : sss.randomPolynomialZ(config.guardiansThreshold, votingKeypair.privKey)
    this.publicParty = {
      index,
      publicKey: keypair.pubKey,
      votingPublicKey: votingKeypair.pubKey
    }

  }

  createPlaintextShares (guardians: PublicParty[]): Array<{ x: number, y: bigint }> {
    const shares = guardians.map((_, i) => {
      const x = i + 1
      const y = sss.evalPolynomialZ(this.polynomial, BigInt(x))
      return { x, y }
    })
    return shares
  }

  createSharesWithoutProofs (guardians: PublicParty[]): { shares: Share[], encryptedShares: EncryptedShare[], votingPublicKey: BabyJubPoint, r1: bigint[], r2: bigint[] } {
    const shares = this.createPlaintextShares(guardians)

    const r1 = guardians.map(genRandomSalt)
    const r2 = guardians.map(genRandomSalt)

    const encryptedShares: EncryptedShare[] = shares.map((share, i) => ({
      guardianPubKey: guardians[i].publicKey,
      encryptedShare: encryptShare(share.y, guardians[i].publicKey, r1[i], r2[i]),
      x: share.x
    }))
    return { shares, encryptedShares, votingPublicKey: this.votingKeypair.pubKey, r1, r2 }
  }

  async createShares (guardians: PublicParty[]): Promise<{ proof: Proof, publicSignals: PublicSignals, encryptedShares: EncryptedShare[], votingPublicKey: BabyJubPoint }> {
    const { shares, encryptedShares, votingPublicKey, r1, r2 } = this.createSharesWithoutProofs(guardians)

    const { proof, publicSignals } = await provePVSS(this.polynomial, r1, r2, guardians.map(g => g.publicKey), votingPublicKey, encryptedShares)
    return { proof, publicSignals, encryptedShares, votingPublicKey }
  }

  prepareBallot (votingPublicKey: BabyJubPoint): { C1: BabyJubPoint, C2: BabyJubPoint, cast: number, r: PrivKey } {
    const r = genRandomSalt()
    const cast = (this.publicParty.index % this.config.options) + 1
    const [C1, C2] = encryptBallot(votingPublicKey, BigInt(cast), r, this.config.size, this.config.options)
    return { C1, C2, cast, r }
  }

  async createBallot (votingPublicKey: BabyJubPoint): Promise<{ C1: BabyJubPoint, C2: BabyJubPoint, proof: Proof, publicSignals: PublicSignals }> {
    const { C1, C2, cast, r } = this.prepareBallot(votingPublicKey)
    const encryptedBallot = [F.toBigint(C1[0]), F.toBigint(C1[1]), F.toBigint(C2[0]), F.toBigint(C2[1])]
    const { proof, publicSignals } = await proveBallot(votingPublicKey, BigInt(cast), r, encryptedBallot)
    return { C1, C2, proof, publicSignals }
  }

  async partialDecryption (C1: BabyJubPoint, receivedShares: Array<{
    share: EncryptedShare
    from: BabyJubPoint
  }>, config: VotingConfig): Promise<Array<{
      pd: BabyJubPoint
      from: PubKey
      proof?: Proof
      publicSignals?: PublicSignals
    }>> {
    return await Promise.all(receivedShares.map(async (s) => {
      const partialDecryption = this.partialDecryptionForEncryptedShare(C1, s.share)
      if (config.skipProofs) {
        return { pd: partialDecryption, from: s.from }
      } else {
        try {
          const eShare = s.share.encryptedShare
          const { proof, publicSignals } = await provePartialDecryption(C1, eShare, this.keypair.privKey, partialDecryption)
          return { pd: partialDecryption, from: s.from, proof, publicSignals }
        } catch (e) {
          console.error(`Failed to generate PartialDecryption proof for share[${s.share.x}]`, e)
          throw e
        }
      }
    }))
  }

  partialDecryptionForEncryptedShare (C1: BabyJubPoint, s: EncryptedShare): BabyJubPoint {
    const y = decryptShare(this.keypair.privKey, s.encryptedShare)
    return this.partialDecryptionForShare(C1, { x: s.x, y })
  }

  partialDecryptionForShare (C1: BabyJubPoint, share: Share): BabyJubPoint {
    return mulPointEscalar(C1, share.y)
  }
}
