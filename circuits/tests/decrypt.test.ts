/// <reference path='../types/types.d.ts'/>

import assert from 'node:assert';
import { WitnessTester } from "circomkit";
import { circomkit } from "./common/index.js";
import { genKeypair, genPrivKey, genPubKey, genRandomSalt, SNARK_FIELD_SIZE, formatPrivKeyForBabyJub } from "../src/babyjub";
import * as F from "../src/F";
import * as ff from 'ffjavascript';
import {  encodeToMessage, encrypt } from '../src/encryption.js';

const stringifyBigInts: (obj: object) => any = ff.utils.stringifyBigInts
const unstringifyBigInts: (obj: object) => any = ff.utils.unstringifyBigInts

const randomPolynomial = (threshold: number): bigint[] => {
  const coefficients = Array.from({ length: threshold }, (_, i) => genRandomSalt());
  return coefficients as bigint[];
}

const evalPolynomial = (coefficients: bigint[], x: bigint): bigint => {
  let result = coefficients[0];
  for (let i = 1; i < coefficients.length; i++) {
    const evals = coefficients[i] * (x ** BigInt(i));
    result = (result + evals) % SNARK_FIELD_SIZE;
  }
  return result % SNARK_FIELD_SIZE;
}

describe("test ElGamalDecrypt", () => {
  const N = 4;
  const threshold = 3;
  const coefficients = randomPolynomial(threshold);
  const keypairs = Array.from({ length: N }, (_, i) => genKeypair());
  const r1 = Array.from({ length: N }, (_, i) => genRandomSalt());
  const r2 = Array.from({ length: N }, (_, i) => genRandomSalt());

  let circuit: WitnessTester<["c1", "c2", "xIncrement", "privKey"], ["out"]>;

  before(async () => {
    circuit = await circomkit.WitnessTester("pvss", {
      file: "decrypt",
      template: "ElGamalDecrypt",
      dir: "test/decrypt",
      pubs: ["c1", "c2", "xIncrement"]
    });
  });

  it("should have correct number of constraints", async () => {
    await circuit.expectConstraintCount(2565);
  });

  it("should decrypt correctly", async () => {
    const share = BigInt(0)
    const privKey = formatPrivKeyForBabyJub(genPrivKey())
    const pubKey = genPubKey(privKey)
    const ciphertext = encrypt(share, pubKey)
    const encoded = encodeToMessage(share)

    const input = {
      c1: [F.toBigint(ciphertext.c1[0]), F.toBigint(ciphertext.c1[1])],
      c2: [F.toBigint(ciphertext.c2[0]), F.toBigint(ciphertext.c2[1])],
      xIncrement: F.toBigint(ciphertext.xIncrement),
      privKey: privKey,
    }
    const out = { out: share }
    await circuit.expectPass(input, out);
  });
});