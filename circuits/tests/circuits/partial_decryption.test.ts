/// <reference path='../../types/types.d.ts'/>

import { ProofTester, WitnessTester } from "circomkit";
import { circomkit } from "../common/index.js";
import { measureTime } from "../common/utils.js";
import { F, mulPointEscalar, scalarToPoint, encryptShare, genKeypair, PartialDecryptionCircuitInput, genRandomSalt, sss } from "shared-crypto";
import { CircuitSignals } from 'shared-crypto/src/proof.js';

const CIRCUIT_NAME = "partial_decryption"
const CIRCUIT_CONFIG = {
    file: "partial_decryption",
    template: "PartialDecryption",
    pubs: ["C1", "partialDecryption", "partialEncryptionKey"]
}

const keypair = genKeypair()
const d_i = keypair.privKey
const E_i = keypair.pubKey


const C1 = genKeypair().pubKey

const PDi = mulPointEscalar(C1, d_i).map(F.toBigint)

export interface PartialDecryptionFullCircuitInput extends CircuitSignals {
    C1: bigint[]
    partialDecryption: bigint[]
    partialEncryptionKey: bigint[]
    partialPrivKey: bigint
}

const input: PartialDecryptionFullCircuitInput = {
    C1: C1.map(F.toBigint),
    partialDecryption: PDi,
    partialEncryptionKey: E_i.map(F.toBigint),
    partialPrivKey: d_i,
}

describe(`test ${CIRCUIT_NAME}`, () => {
    before(async () => {
        circomkit.compile(CIRCUIT_NAME, CIRCUIT_CONFIG)
        const info = await circomkit.info(CIRCUIT_NAME)
        console.log({ info })
    });

    describe(`test witness generation ${CIRCUIT_NAME}`, () => {
        let circuit: WitnessTester<["C1", "partialDecryption", "partialEncryptionKey", "partialPrivKey"]>;

        before(async () => {
            circuit = await circomkit.WitnessTester(CIRCUIT_NAME, CIRCUIT_CONFIG);
        })

        it("should have correct number of constraints", async () => {
            await circuit.expectConstraintCount(2565);
        });

        it("should decrypt correctly", async () => {
            await circuit.expectPass(input);
        });

        it('should assert for correct witness', async () => {
            const witness = await circuit.calculateWitness(input);
            await circuit.expectConstraintPass(witness);
        });
    })

    describe(`test proof generation ${CIRCUIT_NAME} `, () => {
        let circuit: ProofTester<["C1", "partialDecryption", "partialEncryptionKey", "partialPrivKey"]>;

        before(async () => {
            circuit = await circomkit.ProofTester(CIRCUIT_NAME);
        });

        it("should verify a proof correctly", async () => {
            await measureTime("Proof generation", async () => {
                const { proof, publicSignals } = await circuit.prove(input)
                console.log(`Size of proof object: ${Buffer.byteLength(JSON.stringify(proof))} bytes`);
                await circuit.expectPass(proof, publicSignals)
            }) 
        });
        it('should NOT verify a proof with invalid public signals', async () => {
            const { proof } = await circuit.prove(input);
            await circuit.expectFail(proof, ['1']);
        });
    });
})
