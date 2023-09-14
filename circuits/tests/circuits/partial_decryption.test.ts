/// <reference path='../../types/types.d.ts'/>

import assert from 'node:assert';
import { ProofTester, WitnessTester } from "circomkit";
import { circomkit } from "../common/index.js";
import { measureTime } from "../common/utils.js";
import { F, mulPointEscalar, scalarToPoint, encryptShare, genKeypair, PartialDecryptionCircuitInput } from "shared-crypto";

const CIRCUIT_NAME = "partial_decryption"
const CIRCUIT_CONFIG = {
    file: "partial_decryption",
    template: "PartialDecryption",
    pubs: ["A", "c1", "c2", "xIncrement"]
}

const share = BigInt(1)
const { privKey, pubKey } = genKeypair()
const ciphertext = encryptShare(share, pubKey)
const encoded = scalarToPoint(share)

const randomPoint = genKeypair()
const A = randomPoint.pubKey

const out = { partialDecryption: mulPointEscalar(A, share).map(F.toBigint) }


const input: PartialDecryptionCircuitInput = {
    A: A.map(F.toBigint),
    c1: ciphertext.c1.map(F.toBigint),
    c2: ciphertext.c2.map(F.toBigint),
    xIncrement: F.toBigint(ciphertext.xIncrement),
    privKey: privKey,
}

describe(`test ${CIRCUIT_NAME}`, () => {
    before(async () => {
        circomkit.compile(CIRCUIT_NAME, CIRCUIT_CONFIG)
        const info = await circomkit.info(CIRCUIT_NAME)
        console.log({ info })
    });

    describe(`test witness generation ${CIRCUIT_NAME}`, () => {
        let circuit: WitnessTester<["A", "c1", "c2", "xIncrement", "privKey"], ["partialDecryption"]>;

        before(async () => {
            circuit = await circomkit.WitnessTester(CIRCUIT_NAME, CIRCUIT_CONFIG);
        })

        it("should have correct number of constraints", async () => {
            await circuit.expectConstraintCount(2565);
        });

        it("should decrypt correctly", async () => {
            await circuit.expectPass(input, out);
        });

        it("should compute correctly", async () => {
            const output = await circuit.compute(input, ["partialDecryption"]);
            assert(Object.hasOwn(output, "partialDecryption"))
            assert.deepStrictEqual(output.partialDecryption, out.partialDecryption)
        });

        it("should compute witness and read correct output", async () => {
            const witness = await circuit.calculateWitness(input)
            const result = await circuit.readWitnessSignals(witness, ["partialDecryption"])
            assert.deepStrictEqual(result, out)
        });
        it('should assert for correct witness', async () => {
            const witness = await circuit.calculateWitness(input);
            await circuit.expectConstraintPass(witness);
        });
    })

    describe(`test proof generation ${CIRCUIT_NAME} `, () => {
        let circuit: ProofTester<["A", "c1", "c2", "xIncrement", "privKey"]>;

        before(async () => {
            circuit = await circomkit.ProofTester(CIRCUIT_NAME);
        });

        it("should verify a proof correctly", async () => {
            await measureTime("Proof generation", async () => {
                const { proof, publicSignals } = await circuit.prove(input)
                await circuit.expectPass(proof, publicSignals)
            })
        });
        it('should NOT verify a proof with invalid public signals', async () => {
            const { proof } = await circuit.prove(input);
            await circuit.expectFail(proof, ['1']);
        });
    });
})
