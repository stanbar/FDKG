/// <reference path='../../types/types.d.ts'/>

import assert from 'node:assert';
import { ProofTester, WitnessTester } from "circomkit";
import { circomkit } from "../common/index.js";
import { measureTime } from "../common/utils.js";
import {  genPrivKey, genPubKey, formatPrivKeyForBabyJub } from "../../src/babyjub.js";
import * as F from "../../src/F.js";
import {  encodeToMessage, encrypt } from '../../src/encryption.js';

const CIRCUIT_NAME = "decrypt_share"
const CIRCUIT_CONFIG = {
  file: "decrypt_share",
  template: "ElGamalDecrypt",
  dir: "test/decrypt_share",
  pubs: ["c1", "c2", "xIncrement"]
}

const share = BigInt(0)
const privKey = formatPrivKeyForBabyJub(genPrivKey())
const pubKey = genPubKey(privKey)
const ciphertext = encrypt(share, pubKey)
const encoded = encodeToMessage(share)
const out = { out: share }

const input = {
  c1: [F.toBigint(ciphertext.c1[0]), F.toBigint(ciphertext.c1[1])],
  c2: [F.toBigint(ciphertext.c2[0]), F.toBigint(ciphertext.c2[1])],
  xIncrement: F.toBigint(ciphertext.xIncrement),
  privKey: privKey,
}

describe(`test witness generation ${CIRCUIT_NAME}`, () => {
  let circuit: WitnessTester<["c1", "c2", "xIncrement", "privKey"], ["out"]>;

  before(async () => {
    circuit = await circomkit.WitnessTester(CIRCUIT_NAME, CIRCUIT_CONFIG);
  })

  it("should have correct number of constraints", async () => {
    await circuit.expectConstraintCount(2565);
    
  });

  it("should decrypt correctly", async () => {
    await circuit.expectPass(input, out);
  });

  it("should compute witness and read correct output", async () => {
    const witness = await circuit.calculateWitness(input)
    const result = await circuit.readWitnessSignals(witness, ["out"])
    assert.deepEqual(result, out)
  });
})

describe(`test ${CIRCUIT_NAME} proof generation`, () => {
  let circuit: ProofTester<["c1", "c2", "xIncrement", "privKey"]>;

  before(async () => {
    circomkit.instantiate(CIRCUIT_NAME, CIRCUIT_CONFIG)
    await circomkit.setup(CIRCUIT_NAME, "./ptau/powersOfTau28_hez_final_13.ptau")
    circuit = await circomkit.ProofTester(CIRCUIT_NAME);
  });

  it("should verify a proof correctly", async () => {
    await measureTime("Proof generation", async () => {
      const { proof, publicSignals } = await circuit.prove(input)
      await circuit.expectPass(proof, publicSignals)
    })
  });
});