/// <reference path='../types/types.d.ts'/>

import { Circomkit, WitnessTester } from "circomkit";
import { encrypt } from './elgamal-babyjub.js'
import { genKeypair, genRandomSalt } from './maci-crypto.js'
import { circomkit } from "../tests/common/index.js";

import * as ff from 'ffjavascript';
import * as circomlibjs from 'circomlibjs';

const babyJub = await circomlibjs.buildBabyjub()
const F = babyJub.F

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

const N = 4;
const threshold = 3;
const coefficients = randomPolynomial(threshold);
const keypairs = Array.from({ length: N }, (_, i) => genKeypair());
const r1 = Array.from({ length: N }, (_, i) => genRandomSalt());
const r2 = Array.from({ length: N }, (_, i) => genRandomSalt());

async function main() {
  // create circomkit
  const circomkit = new Circomkit({
    protocol: "plonk",
  });

  // artifacts output at `build/pvss` directory
  await circomkit.compile("pvss", {
    file: "pvss",
    template: "PVSS",
    dir: "test/multiplier",
    pubs: ["public_keys"],
    params: [N, threshold],
  });

  // proof & public signals at `build/multiplier_3/my_input` directory
  await circomkit.prove("pvss", "my_input", { in: [3, 5, 7] });

  // verify with proof & public signals at `build/multiplier_3/my_input`
  const ok = await circomkit.verify("multiplier_3", "my_input");
  if (ok) {
    circomkit.log("Proof verified!", "success");
  } else {
    circomkit.log("Verification failed.", "error");
  }
  // test()
}

async function test() {
  let circuit: WitnessTester<["coefficients", "r1", "r2", "public_keys"], ["out"]>;
  circuit = await circomkit.WitnessTester("pvss", {
    file: "pvss",
    template: "PVSS",
    dir: "test/multiplier",
    pubs: ["public_keys"],
    params: [N, threshold],
  });
  await circuit.expectConstraintCount(42224);
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
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
