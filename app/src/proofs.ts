import { readFileSync } from 'fs'
import { BabyJubPoint, BallotCircuitInput, ElGamalCiphertext, F, PVSSCircuitInput, PartialDecryptionCircuitInput, Proof, PubKey, PublicSignals } from 'shared-crypto'
import * as snarkjs from 'snarkjs'
import { measureTime } from './utils.js'
import { EncryptedShare } from './party.js'
import { CircuitSignals } from 'circomkit'
import { writeFileSync } from 'fs'

if (!process.env.PROVER) {
  console.log('PROVER env variable is not set, defaulting to groth16')
  process.env.PROVER = 'groth16'
}

const provers = ['groth16', 'plonk', 'fflonk']
if (!provers.includes(process.env.PROVER)) {
  throw new Error(`Using invalid PROVER env variable ${process.env.PROVER} should be one of ${provers.join(', ')}`)
}

const PROVER: 'groth16' | 'plonk' | 'fflonk' = process.env.PROVER as 'groth16' | 'plonk' | 'fflonk'

const PVSSVariantName = (name: string, guardiansThreshold: number, guardiansCount: number) => `${name}_${guardiansThreshold}_of_${guardiansCount}`

export const provePVSS = async (coefficients: bigint[], r1: bigint[], r2: bigint[], guardiansPubKeys: PubKey[], votingPublicKey: BabyJubPoint, encryptedShares: EncryptedShare[]) => {
  const snarkyInput: PVSSCircuitInput = {
    coefficients,
    r1,
    r2,
    guardiansPubKeys: guardiansPubKeys.map((pubKey) => pubKey.map(F.toBigint)),
    votingPublicKey: votingPublicKey.map(F.toBigint),
    encryptedShares: encryptedShares.map((encryptedShare) => {
      return [
        encryptedShare.encryptedShare.c1[0], encryptedShare.encryptedShare.c1[1],
        encryptedShare.encryptedShare.c2[0], encryptedShare.encryptedShare.c2[1],
        encryptedShare.encryptedShare.xIncrement].map(F.toBigint)
    })
  }

  const name = PVSSVariantName('pvss', coefficients.length, guardiansPubKeys.length)
  // console.log(snarkyInput)
  // writeFileSync(
  //   `${name}.json`,
  //   JSON.stringify(
  //     snarkyInput,
  //     (_, value) => (typeof value === 'bigint' ? value.toString() : value),
  //     2
  //   )
  // )
  return await fullProve(name, PROVER, snarkyInput, `./build/${name}/${name}_js/${name}.wasm`, `./build/${name}/${PROVER}_pkey.zkey`)
}

export const proveBallot = async (votingPublicKey: BabyJubPoint, cast: bigint, r: bigint, encryptedBallot: bigint[]) => {
  const snarkyInput: BallotCircuitInput = {
    votingPublicKey: votingPublicKey.map(F.toBigint),
    cast,
    r,
    encryptedBallot,
  }

  const name = 'encrypt_ballot'
  return await fullProve(name, PROVER, snarkyInput, `./build/${name}/${name}_js/${name}.wasm`, `./build/${name}/${PROVER}_pkey.zkey`)
}

export const provePartialDecryption = async (A: BabyJubPoint, ciphertext: ElGamalCiphertext, privKey: bigint, partialDecryption: BabyJubPoint): Promise<{ proof: Proof, publicSignals: PublicSignals }> => {
  const snarkyInput: PartialDecryptionCircuitInput = {
    C1: A.map(F.toBigint),
    encryptedShareC1: ciphertext.c1.map(F.toBigint),
    encryptedShareC2: ciphertext.c2.map(F.toBigint),
    xIncrement: F.toBigint(ciphertext.xIncrement),
    privKey: privKey,
    partialDecryption: partialDecryption.map(F.toBigint)
}


  const name = 'partial_decryption_share'
  return await fullProve(name, PROVER, snarkyInput, `./build/${name}/${name}_js/${name}.wasm`, `./build/${name}/${PROVER}_pkey.zkey`)
}

const fullProve = async <T extends CircuitSignals>(circuitName: string, protocol: 'groth16' | 'plonk' | 'fflonk', input: T, wasmPath: string, pkeyPath: string): Promise<{ proof: Proof, publicSignals: PublicSignals }> => {
  return await measureTime(circuitName, () => snarkjs[protocol].fullProve(input, wasmPath, pkeyPath))
}

export const verifyPVSS = async (proof: Proof, publicSignals: PublicSignals, guardiansThreshold: number, guardiansSize: number) => {
  const name = PVSSVariantName('pvss', guardiansThreshold, guardiansSize)
  return await verify(name, PROVER, proof, publicSignals)
}

export const verifyBallot = async (proof: Proof, publicSignals: PublicSignals) =>
  await verify('encrypt_ballot', PROVER, proof, publicSignals)

export const verifyPartialDecryption = async (proof: Proof, publicSignals: PublicSignals) =>
  await verify('partial_decryption_share', PROVER, proof, publicSignals)

const verify = async (circuitName: string, protocol: 'groth16' | 'plonk' | 'fflonk', proof: Proof, publicSignals: PublicSignals): Promise<boolean> => {
  const vkey = JSON.parse(readFileSync(`./build/${circuitName}/${protocol}_vkey.json`).toString())

  if (protocol == 'groth16') {
    return snarkjs.groth16.verify(vkey, publicSignals, proof)
  } else if (protocol == 'plonk') {
    return snarkjs.plonk.verify(vkey, publicSignals, proof)
  } else if (protocol == 'fflonk') {
    return snarkjs.fflonk.verify(vkey, publicSignals, proof)
  } else {
    throw new Error('Unknown protocol')
  }
}
