export type Proof = {
    pi_a: [string, string, string]
    pi_b: [string, string, string]
    pi_c: [string, string, string]
    protocol: 'groth16' | 'plonk' | "fflonk"
    curve: 'bn128'
};
export type PublicSignals = string[]

export interface PVSSCircuitInput {
    coefficients: bigint[];
    r1: bigint[];
    r2: bigint[];
    guardiansPubKeys: bigint[][];
}
export interface BallotCircuitInput {
    votingPublicKey: bigint[];
    cast: bigint;
    r: bigint;
}

export interface PartialDecryptionCircuitInput {
    A: bigint[];
    c1: bigint[];
    c2: bigint[];
    xIncrement: bigint;
    privKey: bigint;
}