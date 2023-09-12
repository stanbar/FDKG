import { BabyJubPoint, ElGamalCiphertext, F, PubKey } from "shared-crypto";
// @ts-ignore
import * as snarkjs from "snarkjs"

const PROTOCOL = "groth16"

export type Proof = {
    pi_a: [string, string, string]
    pi_b: [string, string, string]
    pi_c: [string, string, string]
    protocol: 'groth16' | 'plonk' | "fflonk"
    curve: 'bn128'
};
type PublicSignals = string[]

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

const fullProve = async (protocol: 'groth16' | 'plonk' | "fflonk", input: PVSSCircuitInput | BallotCircuitInput | PartialDecryptionCircuitInput, wasmPath: string, pkeyPath: string): Promise<{ proof: Proof, publicSignals: PublicSignals }> => {
    if (protocol == "groth16") {
        return snarkjs.groth16.fullProve(input, wasmPath, pkeyPath)
    } else if (protocol == "plonk") {
        return snarkjs.plonk.fullProve(input, wasmPath, pkeyPath)
    } else if (protocol == "fflonk") {
        return snarkjs.fflonk.fullProve(input, wasmPath, pkeyPath)
    } else {
        throw new Error("Unknown protocol")
    }
}

export const provePVSS = (polynomial: bigint[], r1: bigint[], r2: bigint[], guardiansPubKeys: PubKey[]) => {
    const snarkyInput: PVSSCircuitInput = {
        coefficients: polynomial,
        r1: r1,
        r2: r2,
        guardiansPubKeys: guardiansPubKeys.map((pubKey) => pubKey.map(F.toBigint))
    }
    return fullProve(PROTOCOL, snarkyInput, "./build/pvss/pvss_js/pvss.wasm", "./build/pvss/groth16_pkey.zkey")
}

export const proveBallot = (votingPublicKey: BabyJubPoint, cast: bigint, r: bigint) => {
    const snarkyInput: BallotCircuitInput = {
        votingPublicKey: votingPublicKey.map(F.toBigint),
        cast: cast,
        r: r,
    }
    return fullProve(PROTOCOL, snarkyInput, "./build/encrypt_ballot/encrypt_ballot_js/encrypt_ballot.wasm", "./build/encrypt_ballot/groth16_pkey.zkey")
}

export const provePartialDecryption = (A: BabyJubPoint, c1: BabyJubPoint, c2: BabyJubPoint, xIncrement: Uint8Array, privKey: bigint): Promise<{ proof: Proof, publicSignals: PublicSignals }> => {
    const snarkyInput: PartialDecryptionCircuitInput = {
        A: A.map(F.toBigint),
        c1: c1.map(F.toBigint),
        c2: c2.map(F.toBigint),
        xIncrement: F.toBigint(xIncrement),
        privKey: privKey,
    }
    return fullProve(PROTOCOL, snarkyInput, "./build/partial_decryption/partial_decryption_js/partial_decryption.wasm", "./build/partial_decryption/groth16_pkey.zkey")
}

const verify = async (protocol: 'groth16' | 'plonk' | "fflonk", proof: Proof, publicSignals: PublicSignals, vkey: object): Promise<boolean> => {
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

export const verifyPVSS = async (proof: Proof, publicSignals: PublicSignals): Promise<boolean> => {
    const vkey = await import("../build/pvss/groth16_vkey.json")
    return verify(PROTOCOL, proof, publicSignals, vkey)
}

export const verifyBallot = async (proof: Proof, publicSignals: PublicSignals): Promise<boolean> => {
    const vkey = await import("../build/encrypt_ballot/groth16_vkey.json")
    return verify(PROTOCOL, proof, publicSignals, vkey)
}

export const verifyPartialDecryption = async (proof: Proof, publicSignals: PublicSignals): Promise<boolean> => {
    const vkey = await import("../build/partial_decryption/groth16_vkey.json")
    return verify(PROTOCOL, proof, publicSignals, vkey)
}