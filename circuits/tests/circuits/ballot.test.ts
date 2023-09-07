/// <reference path='../../types/types.d.ts'/>

import assert from 'node:assert';
import { WitnessTester } from "circomkit";
import { circomkit } from "../common/index.js";
import { genPrivKey, genPubKey, formatPrivKeyForBabyJub, genRandomSalt, SNARK_FIELD_SIZE, addPoint, mulPointEscalar, Base8, BabyJubPoint } from "../../src/babyjub.js";
import * as F from "../../src/F.js";
import { encodeToMessage, encrypt } from '../../src/encryption.js';
import * as ff from 'ffjavascript';
const unstringifyBigInts: (obj: object) => any = ff.utils.unstringifyBigInts
/*
    We use ballot encoding as defined by Baudron et al. Practical multi-candidate election system
    Suppose that we have n voters, choose m so that m is the smallest integer such that 2^m > n.
 */
function findMbits(voters: number): bigint {
    const n = voters
    let m = 0n
    let val = 1n
    while (val <= n) {
        val *= 2n
        m += 1n
    }
    return m
}

const encodeBallot = (votingPubKey: BabyJubPoint, cast: bigint, r: bigint, voters: number, options: number): BabyJubPoint => {
    assert(1n <= cast);
    assert(cast <= BigInt(options));

    const mBits = findMbits(voters)

    const exponent = ((cast - 1n) * mBits)
    const message = (2n ** exponent) % SNARK_FIELD_SIZE

    const mG = mulPointEscalar(Base8, message)
    const rP = mulPointEscalar(votingPubKey, r)
    const c2 = addPoint(mG, rP)
    return c2
}

const decryptBallot = (c1: BabyJubPoint, c2: BabyJubPoint, privKey: bigint, voters: number, options: number): bigint => {
    const mBits = findMbits(voters)
    const c1r = mulPointEscalar(c1, privKey)
    const c1rXNeg = F.neg(c1r[0])
    const mG = addPoint(c2, [c1rXNeg, c1r[1]])
    let x = 1n
    while (x <= options) {
        const exponent = ((x - 1n) * mBits)
        const message = (2n ** exponent) % SNARK_FIELD_SIZE

        const decoded = mulPointEscalar(Base8, message)
        if (F.toBigint(decoded[0]) === F.toBigint(mG[0]) && F.toBigint(decoded[1]) === F.toBigint(mG[1])) {
            return x
        }
        x += 1n
    }
    throw Error("Could not decrypt ballot")
}

describe("test Ballot Encryption", () => {
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

    let circuit: WitnessTester<["cast", "r", "votingPublicKey"], ["out"]>;

    before(async () => {
        circuit = await circomkit.WitnessTester("encrypt_ballot", {
            file: "encrypt_ballot",
            template: "EncrytedBallot",
            dir: "test/encrypt_ballot",
            pubs: ["votingPublicKey"],
            params: [VOTERS, OPTIONS],
        });
    });

    it("should have calculate witness", async () => {
        await circuit.calculateWitness(input)
    });

    it("should decrypt correctly", async () => {
        await circuit.expectPass(input, out);
    });

    it.only("should compute witness and read correct output", async () => {
        const witness = await circuit.calculateWitness(input)
        const result = await circuit.readWitnessSignals(witness, ["out"])
        assert.deepEqual(result, out)
    });

    it.only("should compute ciphertext which can be decrypted using private key", async () => {
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