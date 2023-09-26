import { SignalValueType } from "circomkit/dist/types/circuit";
import { readFileSync } from "fs";
import { BabyJubPoint, F, PubKey } from "shared-crypto";
// @ts-ignore
import * as snarkjs from "snarkjs"
import { measureTime } from "./utils";

if (!process.env.PROVER) {
    console.log("PROVER env variable is not set, defaulting to groth16")
    process.env.PROVER="groth16"
}

const provers = ["groth16", "plonk", "fflonk"]
if (!provers.includes(process.env.PROVER)) {
    throw new Error(`Using invalid PROVER env variable ${process.env.PROVER} should be one of ${provers.join(", ")}`)
}

const PROVER: 'groth16' | 'plonk' | "fflonk" = process.env.PROVER as 'groth16' | 'plonk' | 'fflonk';

export type Proof = {
    pi_a: [string, string, string]
    pi_b: [string, string, string]
    pi_c: [string, string, string]
    protocol: 'groth16' | 'plonk' | "fflonk"
    curve: 'bn128'
};
type PublicSignals = string[]

export type CircuitSignals<T extends readonly string[] = []> = T extends [] ? {
    [signal: string]: SignalValueType;
} : {
    [signal in T[number]]: SignalValueType;
};

export interface PVSSCircuitInput extends CircuitSignals {
    coefficients: bigint[];
    r1: bigint[];
    r2: bigint[];
    guardiansPubKeys: bigint[][];
}
export interface BallotCircuitInput extends CircuitSignals {
    votingPublicKey: bigint[];
    cast: bigint;
    r: bigint;
}

export interface PartialDecryptionCircuitInput extends CircuitSignals {
    A: bigint[];
    c1: bigint[];
    c2: bigint[];
    xIncrement: bigint;
    privKey: bigint;
}

const PVSSVariantName = (name: string, guardiansThreshold: number, guardiansCount: number) => `${name}_${guardiansThreshold}_of_${guardiansCount}`

export const provePVSS = (coefficients: bigint[], r1: bigint[], r2: bigint[], guardiansPubKeys: PubKey[]) => {
    const snarkyInput: PVSSCircuitInput = {
        coefficients,
        r1,
        r2,
        guardiansPubKeys: guardiansPubKeys.map((pubKey) => pubKey.map(F.toBigint))
    }

    const name = PVSSVariantName("pvss", coefficients.length, guardiansPubKeys.length)
    return fullProve(name, PROVER, snarkyInput, `./build/${name}/${name}_js/${name}.wasm`, `./build/${name}/groth16_pkey.zkey`)
}

export const proveBallot = (votingPublicKey: BabyJubPoint, cast: bigint, r: bigint) => {
    const snarkyInput: BallotCircuitInput = {
        votingPublicKey: votingPublicKey.map(F.toBigint),
        cast,
        r,
    }

    const name = "encrypt_ballot"
    return fullProve(name, PROVER, snarkyInput, `./build/${name}/${name}_js/${name}.wasm`, `./build/${name}/groth16_pkey.zkey`)
}

export const provePartialDecryption = (A: BabyJubPoint, c1: BabyJubPoint, c2: BabyJubPoint, xIncrement: Uint8Array, privKey: bigint): Promise<{ proof: Proof, publicSignals: PublicSignals }> => {
    const snarkyInput: PartialDecryptionCircuitInput = {
        A: A.map(F.toBigint),
        c1: c1.map(F.toBigint),
        c2: c2.map(F.toBigint),
        xIncrement: F.toBigint(xIncrement),
        privKey,
    }
    const name = "partial_decryption"
    return fullProve(name, PROVER, snarkyInput, `./build/${name}/${name}_js/${name}.wasm`, `./build/${name}/groth16_pkey.zkey`)
}

const fullProve = async <T extends CircuitSignals>(circuitName: string, protocol: 'groth16' | 'plonk' | "fflonk", input: T, wasmPath: string, pkeyPath: string): Promise<{ proof: Proof, publicSignals: PublicSignals }> => { 
    return measureTime(circuitName, () => snarkjs[protocol].fullProve(input, wasmPath, pkeyPath))
}

export const verifyPVSS = (proof: Proof, publicSignals: PublicSignals, guardiansThreshold: number, guardiansSize: number) => {
    const name = PVSSVariantName("pvss", guardiansThreshold, guardiansSize)
    return verify(name, PROVER, proof, publicSignals)
}

export const verifyBallot = (proof: Proof, publicSignals: PublicSignals) =>
    verify("encrypt_ballot", PROVER, proof, publicSignals)

export const verifyPartialDecryption = (proof: Proof, publicSignals: PublicSignals) =>
    verify("partial_decryption", PROVER, proof, publicSignals)

const verify = (circuitName: string, protocol: 'groth16' | 'plonk' | "fflonk", proof: Proof, publicSignals: PublicSignals): Promise<boolean> => {
    const vkey = JSON.parse(readFileSync(`./build/${circuitName}/${protocol}_vkey.json`).toString())

    if (protocol == "groth16") {
        return snarkjs.groth16.verify(vkey, publicSignals, proof)
    } else if (protocol == "plonk") {
        return snarkjs.plonk.verify(vkey, publicSignals, proof)
    } else if (protocol == "fflonk") {
        return snarkjs.fflonk.verify(vkey, publicSignals, proof)
    } else {
        throw new Error("Unknown protocol")
    }
}