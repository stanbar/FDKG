/// <reference path='../../types/types.d.ts'/>

import assert from 'node:assert';
import { ProofTester, WitnessTester } from "circomkit";
import { circomkit } from "../common/index.js";
import { measureTime } from "../common/utils.js";
import { F, genPrivKey, genPubKey, formatPrivKeyForBabyJub, scalarToPoint, encryptShare } from "shared-crypto";

const CIRCUIT_NAME = "decrypt_share"
const CIRCUIT_CONFIG = {
  file: "decrypt_share",
  template: "ElGamalDecrypt",
  pubs: ["c1", "c2", "xIncrement"]
}

const share = BigInt(0)
const privKey = formatPrivKeyForBabyJub(genPrivKey())
const pubKey = genPubKey(privKey)
const ciphertext = encryptShare(share, pubKey)
const encoded = scalarToPoint(share)
const out = { plaintext: share }

const input = {
  c1: [F.toBigint(ciphertext.c1[0]), F.toBigint(ciphertext.c1[1])],
  c2: [F.toBigint(ciphertext.c2[0]), F.toBigint(ciphertext.c2[1])],
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
    let circuit: WitnessTester<["c1", "c2", "xIncrement", "privKey"], ["plaintext"]>;

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
      const output = await circuit.compute(input, ["plaintext"]);
      assert(Object.hasOwn(output, "plaintext"))
      assert.deepStrictEqual(output.plaintext, out.plaintext)
    });

    it("should compute witness and read correct output", async () => {
      const witness = await circuit.calculateWitness(input)
      const result = await circuit.readWitnessSignals(witness, ["plaintext"])
      assert.deepStrictEqual(result, out)
    });
    it('should assert for correct witness', async () => {
      const witness = await circuit.calculateWitness(input);
      await circuit.expectConstraintPass(witness);
    });
  })

  describe(`test ${CIRCUIT_NAME} proof generation`, () => {
    let circuit: ProofTester<["c1", "c2", "xIncrement", "privKey"]>;

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
});