/// <reference path='../types/types.d.ts'/>

import assert from 'node:assert';
import { WitnessTester } from "circomkit";
import { circomkit } from "./common/index.js";
import {  genPrivKey, genPubKey, formatPrivKeyForBabyJub } from "../src/babyjub";
import * as F from "../src/F";
import {  encodeToMessage, encrypt } from '../src/encryption.js';

describe("test ElGamalDecrypt", () => {
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
    const out = { out: share }
    await circuit.expectPass(input, out);
  });

  it.only("should decrypt quickly", async () => {
    let start = Date.now()
    const witness = await circuit.calculateWitness(input)
    let end = Date.now()
    console.log(`Calculating witness time: ${end - start}ms`)

    start = Date.now()
    const result = await circuit.readWitnessSignals(witness, ["out"])
    console.log({result})
    end = Date.now()
    console.log(`Calculating reading witness signals time: ${end - start}ms`)
  });
});