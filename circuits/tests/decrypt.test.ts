/// <reference path='../types/types.d.ts'/>

import assert from 'node:assert';
import { WitnessTester } from "circomkit";
import { circomkit } from "./common/index.js";
import { BabyJubPoint, genKeypair, genPrivKey, genPubKey, genRandomSalt, SNARK_FIELD_SIZE }  from "../src/babyjub";
import * as F from "../src/F";
import * as ff from 'ffjavascript';
import { ElGamalCiphertext, decrypt, encrypt } from '../src/encryption.js';

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

  it.only("should decrypt correctly", async () => {
    const share = evalPolynomial(coefficients, BigInt(1))
    const privKey = genPrivKey()
    const pubKey = genPubKey(privKey)
    const ciphertext = encrypt(share, pubKey)

    const input = {
      c1: ciphertext.c1,
      c2: ciphertext.c2,
      xIncrement: ciphertext.xIncrement,
      privKey: F.fromBigint(privKey),
    }
    const out = share

    await circuit.expectPass(stringifyBigInts(input), {out});
  });
});