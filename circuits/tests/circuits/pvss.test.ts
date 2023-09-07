/// <reference path='../../types/types.d.ts'/>

import assert from 'node:assert';
import { WitnessTester } from "circomkit";
import { circomkit } from "../common/index.js";
import { genKeypair, genRandomSalt, SNARK_FIELD_SIZE } from "../../src/babyjub.js";
import * as F from "../../src/F.js";
import * as ff from 'ffjavascript';
import { ElGamalCiphertext, decrypt, encrypt } from '../../src/encryption.js';

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

describe("pvss", () => {
  const N = 4;
  const threshold = 3;
  const coefficients = randomPolynomial(threshold);
  const keypairs = Array.from({ length: N }, (_, i) => genKeypair());
  const r1 = Array.from({ length: N }, (_, i) => genRandomSalt());
  const r2 = Array.from({ length: N }, (_, i) => genRandomSalt());
  const input = {
    coefficients,
    r1,
    r2,
    public_keys: keypairs.map((key) => key.pubKey.map(F.toBigint))
  }

  const shares = Array.from({ length: N }, (_, i) => {
    const share = evalPolynomial(coefficients, BigInt(i + 1))
    return share
  })
  const ciphertexts = shares.map((share, i): ElGamalCiphertext => {
    return encrypt(share, keypairs[i].pubKey, r1[i], r2[i])
  })
  const out = {
    out: ciphertexts.map((ciphertext) => {
      return [
        ciphertext.c1[0], ciphertext.c1[1],
        ciphertext.c2[0], ciphertext.c2[1],
        ciphertext.xIncrement].map(F.toBigint)
    })
  }
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

  it("should have correct number of constraints", async () => {
    await circuit.expectConstraintCount(42212);
  });
  it("should encrypt correctly", async () => {
    for (let i = 0; i < N; i++) {
      const share = evalPolynomial(coefficients, BigInt(i + 1))
      const message = encrypt(share, keypairs[i].pubKey)
      const decoded = decrypt(keypairs[i].privKey, message)

      assert(share == decoded)
    }
  })
  it("should distribute encrypted shares", async () => {
    await circuit.expectPass(input, out);
  });

  it.only("should compute witness and read correct output", async () => {
    const witness = await circuit.calculateWitness(input)
    const result = await circuit.readWitnessSignals(witness, ["out"])
    assert.deepEqual(result, out)
  });
});