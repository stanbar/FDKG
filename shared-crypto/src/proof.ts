import { SignalValueType } from 'circomkit/dist/types/circuit'

export type Proof = {
    pi_a: [string, string, string]
    pi_b: [string, string, string]
    pi_c: [string, string, string]
    protocol: 'groth16' | 'plonk' | "fflonk"
    curve: 'bn128'
};
export type PublicSignals = string[]

export type CircuitSignals<T extends readonly string[] = []> = T extends [] ? {
  [signal: string]: SignalValueType
} : {
  [signal in T[number]]: SignalValueType;
}

export interface PVSSCircuitInput extends CircuitSignals {
  coefficients: bigint[]
  r1: bigint[]
  r2: bigint[]
  guardiansPubKeys: bigint[][]
  votingPublicKey: bigint[]
  encryptedShares: bigint[][]
}
export interface BallotCircuitInput extends CircuitSignals {
  votingPublicKey: bigint[]
  cast: bigint
  r: bigint
  encryptedBallot: bigint[]
}

export interface PartialDecryptionCircuitInput extends CircuitSignals {
  C1: bigint[]
  encryptedShareC1: bigint[]
  encryptedShareC2: bigint[]
  xIncrement: bigint
  privKey: bigint
  partialDecryption: bigint[]
}
