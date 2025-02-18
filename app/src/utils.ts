import { genKeypair, genPubKey } from 'shared-crypto'
import { LocalParty } from './party.js'
import { evalPolynomialZ, randomPolynomialZ } from 'shared-crypto'
import { VotingConfig } from './configs.js'

export const generateSetOfNodes = (config: VotingConfig): LocalParty[] => {
  if (config.guardiansThreshold > config.size - 1) {
    throw new Error("Guardians threshold must be less than size-1 otherwise it's impossible to reconstruct the secret")
  }
  return Array.from({ length: config.size }, (_, i) => {
    const poly = randomPolynomialZ(config.guardiansThreshold)
    const votingPrivKey = evalPolynomialZ(poly, 0n)
    const votingPubKey = genPubKey(votingPrivKey)
    const votingKeypair = { privKey: votingPrivKey, pubKey: votingPubKey }

    const keypair = genKeypair()
    return new LocalParty(i + 1, keypair, votingKeypair, config, poly)
  })
}

export const measureTime = async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  const start = new Date().getTime()
  const result = await fn()
  const end = new Date().getTime()
  const seconds = (end - start) / 1000
  console.log(`${name} took ${seconds}s`)
  return result
}
