/// <reference path='../../types/types.d.ts'/>

import assert from 'node:assert';
import { WitnessTester, ProofTester } from "circomkit";
import { circomkit } from "../common/index.js";
import { F, genPrivKey, genPubKey, formatPrivKeyForBabyJub, genRandomSalt, decryptBallot, BallotCircuitInput } from "shared-crypto";
import { measureTime } from '../common/utils.js';
import { encryptBallot } from 'shared-crypto/src/ballot.js';

const VOTERS = 10 as const;
const OPTIONS = 3 as const;
const cast = BigInt(3)
const r = genRandomSalt()

const votingPrivKey = formatPrivKeyForBabyJub(genPrivKey())
const votingPubKey = genPubKey(votingPrivKey)

const [C1, C2] = encryptBallot(votingPubKey, cast, r, VOTERS, OPTIONS)

assert.equal(decryptBallot(C1, C2, votingPrivKey, VOTERS, OPTIONS), cast)

const input: BallotCircuitInput = {
    votingPublicKey: [F.toBigint(votingPubKey[0]), F.toBigint(votingPubKey[1])],
    cast,
    r,
    encryptedBallot: [F.toBigint(C1[0]), F.toBigint(C1[1]), F.toBigint(C2[0]), F.toBigint(C2[1])],
}

const CIRCUIT_NAME = "encrypt_ballot"
const CIRCUIT_CONFIG = {
    file: "encrypt_ballot",
    template: "EncrytedBallot",
    pubs: ["votingPublicKey", "encryptedBallot"],
    params: [VOTERS, OPTIONS],
}

describe(`test ${CIRCUIT_NAME}`, () => {
    before(async () => {
        circomkit.compile(CIRCUIT_NAME, CIRCUIT_CONFIG)
        const info = await circomkit.info(CIRCUIT_NAME)
        console.log({ info })
    });
    describe(`test witness generation ${CIRCUIT_NAME} `, () => {
        let circuit: WitnessTester<["votingPublicKey", "cast", "r", "encryptedBallot"]>;

        before(async () => {
            circuit = await circomkit.WitnessTester(CIRCUIT_NAME, CIRCUIT_CONFIG);
        });

        it("should have correct number of constraints", async () => {
            await circuit.expectConstraintCount(2565);
        });

        it("should have calculate witness", async () => {
            await circuit.calculateWitness(input)
        });

        it("should decrypt correctly", async () => {
            await circuit.expectPass(input);
        });

        it('should assert for correct witness', async () => {
            const witness = await circuit.calculateWitness(input);
            await circuit.expectConstraintPass(witness);
        });
    });

    describe(`test ${CIRCUIT_NAME} proof generation`, () => {
        let circuit: ProofTester<["votingPublicKey", "cast", "r", "encryptedBallot"]>;

        before(async () => {
            circuit = await circomkit.ProofTester(CIRCUIT_NAME, "groth16");
        });

        it("should verify a proof correctly", async () => {
            await measureTime("Proof generation", async () => {
                const { proof, publicSignals } = await circuit.prove(input)
                await circuit.expectPass(proof, publicSignals)
            }, 10)
        });
        it('should NOT verify a proof with invalid public signals', async () => {
            const { proof } = await circuit.prove(input);
            await circuit.expectFail(proof, ['1']);
        });
    });
});