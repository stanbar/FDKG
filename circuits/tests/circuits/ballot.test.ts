/// <reference path='../../types/types.d.ts'/>

import assert from 'node:assert';
import { WitnessTester, ProofTester, Circomkit } from "circomkit";
import { circomkit } from "../common/index.js";
import { genPrivKey, genPubKey, formatPrivKeyForBabyJub, genRandomSalt, SNARK_FIELD_SIZE, addPoint, mulPointEscalar, Base8, BabyJubPoint } from "../../src/babyjub.js";
import * as F from "../../src/F.js";
import { encodeBallot, decryptBallot } from '../../src/ballot';
import * as ff from 'ffjavascript';
import { measureTime } from '../common/utils.js';
const unstringifyBigInts: (obj: object) => any = ff.utils.unstringifyBigInts

const VOTERS = 10 as const;
const OPTIONS = 3 as const;
const cast = BigInt(3)
const r = genRandomSalt()


const votingPrivKey = formatPrivKeyForBabyJub(genPrivKey())
const votingPubKey = genPubKey(votingPrivKey)

const C1: BabyJubPoint = mulPointEscalar(Base8, r)
const C2: BabyJubPoint = encodeBallot(votingPubKey, cast, r, VOTERS, OPTIONS)

assert.equal(decryptBallot(C1, C2, votingPrivKey, VOTERS, OPTIONS), cast)

const input = {
    votingPublicKey: [F.toBigint(votingPubKey[0]), F.toBigint(votingPubKey[1])],
    cast,
    r,
}
const out = {
    out: [F.toBigint(C1[0]), F.toBigint(C1[1]), F.toBigint(C2[0]), F.toBigint(C2[1])],
}

const CIRCUIT_NAME = "encrypt_ballot"
const CIRCUIT_CONFIG = {
    file: "encrypt_ballot",
    template: "EncrytedBallot",
    dir: "test/encrypt_ballot",
    pubs: ["votingPublicKey"],
    params: [VOTERS, OPTIONS],
}

describe(`test ${CIRCUIT_NAME} witness generation`, () => {
    let circuit: WitnessTester<["cast", "r", "votingPublicKey"], ["out"]>;

    before(async () => {
        circuit = await circomkit.WitnessTester(CIRCUIT_NAME, CIRCUIT_CONFIG);
    });

    it("should have calculate witness", async () => {
        await circuit.calculateWitness(input)
    });

    it("should decrypt correctly", async () => {
        await circuit.expectPass(input, out);
    });

    it("should compute witness and read correct output", async () => {
        const witness = await circuit.calculateWitness(input)
        const result = await circuit.readWitnessSignals(witness, ["out"])
        assert.deepEqual(result, out)
    });

    it("should compute ciphertext which can be decrypted using private key", async () => {
        const witness = await circuit.calculateWitness(input)
        const result = await circuit.readWitnessSignals(witness, ["out"])
        const out = result as any

        const x = decryptBallot([F.fromBigint(out.out[0]), F.fromBigint(out.out[1])],
            [F.fromBigint(out.out[2]), F.fromBigint(out.out[3])],
            votingPrivKey,
            VOTERS,
            OPTIONS)
        assert.equal(x, cast)
    });
});

describe(`test ${CIRCUIT_NAME} proof generation`, () => {
    let circuit: ProofTester<["cast", "r", "votingPublicKey"]>;

    before(async () => {
        circomkit.instantiate(CIRCUIT_NAME, CIRCUIT_CONFIG)
        await circomkit.setup(CIRCUIT_NAME, "./ptau/powersOfTau28_hez_final_15.ptau")
        circuit = await circomkit.ProofTester(CIRCUIT_NAME);
    });

    it("should verify a proof correctly", async () => {
        await measureTime("Proof generation", async () => {
            const { proof, publicSignals } = await circuit.prove(input)
            await circuit.expectPass(proof, publicSignals)
        })
    });
});