/// <reference path='../../types/types.d.ts'/>

import assert from 'node:assert';
import { ProofTester, WitnessTester } from "circomkit";
import { circomkit } from "../common/index.js";
import { measureTime } from "../common/utils.js";
import { F, mulPointEscalar, scalarToPoint, encryptShare, genKeypair, PartialDecryptionCircuitInput, genRandomSalt, sss } from "shared-crypto";

const CIRCUIT_NAME = "partial_decryption_share"
const CIRCUIT_CONFIG = {
    file: "partial_decryption_share",
    template: "PartialDecryptionShare",
    pubs: ["C1", "encryptedShareC1", "encryptedShareC2", "xIncrement", "partialDecryption"],
}
const poly = sss.randomPolynomialZ(3, 123n)
const share = sss.evalPolynomialZ(poly, 1n)


const { privKey, pubKey } = genKeypair()
const ciphertext = encryptShare(share, pubKey)
const encoded = scalarToPoint(share)

const randomPoint = genKeypair()
const A = randomPoint.pubKey

const partialDecryption = mulPointEscalar(A, share)

const input: PartialDecryptionCircuitInput = {
    C1: A.map(F.toBigint),
    encryptedShareC1: ciphertext.c1.map(F.toBigint),
    encryptedShareC2: ciphertext.c2.map(F.toBigint),
    xIncrement: F.toBigint(ciphertext.xIncrement),
    privKey: privKey,
    partialDecryption: partialDecryption.map(F.toBigint)
}

describe(`test ${CIRCUIT_NAME}`, () => {
    before(async () => {
        circomkit.compile(CIRCUIT_NAME, CIRCUIT_CONFIG)
        const info = await circomkit.info(CIRCUIT_NAME)
        console.log({ info })
        console.log({share, randomSalt: genRandomSalt()})
    });

    describe(`test witness generation ${CIRCUIT_NAME}`, () => {
        let circuit: WitnessTester<["C1", "encryptedShareC1", "encryptedShareC2", "xIncrement", "partialDecryption", "privKey"]>;

        before(async () => {
            circuit = await circomkit.WitnessTester(CIRCUIT_NAME, CIRCUIT_CONFIG);
        })

        it("should have correct number of constraints", async () => {
            await circuit.expectConstraintCount(2565);
        });

        it.only("should decrypt correctly", async () => {
            await circuit.expectPass(input);
        });

        it('should assert for correct witness', async () => {
            const witness = await circuit.calculateWitness(input);
            await circuit.expectConstraintPass(witness);
        });
    })

    describe(`test proof generation ${CIRCUIT_NAME} `, () => {
        let circuit: ProofTester<["C1", "encryptedShareC1", "encryptedShareC2", "xIncrement", "partialDecryption", "privKey"]>;

        before(async () => {
            circuit = await circomkit.ProofTester(CIRCUIT_NAME);
        });

        it.only("should verify a proof correctly", async () => {
            await measureTime("Proof generation", async () => {
                const { proof, publicSignals } = await circuit.prove(input);
                console.log(`Size of proof object: ${Buffer.byteLength(JSON.stringify(proof))} bytes`);
                await circuit.expectPass(proof, publicSignals);
            });
        });
        it('should NOT verify a proof with invalid public signals', async () => {
            const { proof } = await circuit.prove(input);
            await circuit.expectFail(proof, ['1']);
        });
    });
})
