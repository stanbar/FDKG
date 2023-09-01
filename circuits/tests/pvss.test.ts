/// <reference path='../types/types.d.ts'/>

import { WitnessTester } from "circomkit";
import { circomkit } from "./common/index.js";
import { encrypt } from '../src/elgamal-babyjub.js'
import { genKeypair, genRandomSalt } from '../src/maci-crypto.js'

import * as ff from 'ffjavascript';

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
      dir: "test/multiplier",
      pubs: ["public_keys"],
      params: [N, threshold],
    });
  });

  it("should have correct number of constraints", async () => {
    await circuit.expectConstraintCount(42212);
  });

  it("should multiply correctly", async () => {
    const input = {
      coefficients,
      r1,
      r2,
      public_keys: keypairs.map((key) => key.pubKey)
    }
    const out = await Promise.all(Array.from({ length: N }, async (_, i) => {
        const share = evalPolynomial(coefficients, BigInt(i+1))
        const { c1, c2, xIncrement } = await encrypt(share, keypairs[i].pubKey, r1[i])
        return [c1.x, c1.y, c2.x, c2.y, xIncrement]
    }))

    await circuit.expectPass(stringifyBigInts(input), stringifyBigInts({out}));
  });
});