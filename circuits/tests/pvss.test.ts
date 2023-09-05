/// <reference path='../types/types.d.ts'/>

import assert from 'node:assert';
import { WitnessTester } from "circomkit";
import { circomkit } from "./common/index.js";
import { BabyJubPoint, genKeypair, genRandomSalt }  from "../src/babyjub";
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
    result = result + evals;
  }
  return result;
}

describe("pvss", () => {
  const N = 4;
  const threshold = 3;
  const coefficients = randomPolynomial(threshold);
  const keypairs = Array.from({ length: N }, (_, i) => genKeypair());
  const r1 = Array.from({ length: N }, (_, i) => genRandomSalt());
  const r2 = Array.from({ length: N }, (_, i) => genRandomSalt());

  let circuit: WitnessTester<["coefficients", "r1", "r2", "public_keys"], ["out"]>;

  before(async () => {
    circuit = await circomkit.WitnessTester("pvss", {
      file: "pvss",
      template: "PVSS",
      dir: "test/pvss",
      pubs: ["public_keys"],
      params: [N, threshold],
    });
  });

  it.only("encode decode", async () => {
    const value = BigInt(1)
    F.e(value)
  });
  it("should have correct number of constraints", async () => {
    await circuit.expectConstraintCount(42212);
  });
  it("should encrypt correctly", async () => {
    const shares = Array.from({ length: N }, (_, i) => {
        const share = evalPolynomial(coefficients, BigInt(i+1))
        return share
    })
    const ciphertexts = shares.map((share, i): ElGamalCiphertext => {
        return encrypt(share, keypairs[i].pubKey, r1[i])
    })

    ciphertexts.map((ciphertext, i) => {
      assert(shares[i] == decrypt(keypairs[i].privKey, ciphertext), "decryption failed")
    })
  })
  it("should multiply correctly", async () => {
    const input = {
      coefficients,
      r1,
      r2,
      public_keys: keypairs.map((key) => key.pubKey)
    }
    const shares = Array.from({ length: N }, (_, i) => {
        const share = evalPolynomial(coefficients, BigInt(i+1))
        return share
    })
    const ciphertexts = shares.map((share, i): ElGamalCiphertext => {
        return encrypt(share, keypairs[i].pubKey, r1[i])
    })
    const out = ciphertexts.map((ciphertext) => {
      return [ciphertext.c1[0], ciphertext.c1[1], ciphertext.c2[0], ciphertext.c2[1], ciphertext.xIncrement]
    })

    await circuit.expectPass(stringifyBigInts(input), stringifyBigInts({out}));
  });
});