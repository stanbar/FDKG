/// <reference path='../../types/types.d.ts'/>

import assert from 'node:assert';
import { ProofTester, WitnessTester } from "circomkit";
import { circomkit } from "../common/index.js";
import { F, genPubKey, genKeypair, genRandomSalt, ElGamalCiphertext, decryptShare, encryptShare, PVSSCircuitInput, sss } from "shared-crypto";
import { measureTime } from '../common/utils.js';

describe.only("batch PVSS for 3-of-4 access structure", () => {
  const N = 4;
  const threshold = 3;
  const coefficients = sss.randomPolynomialZ(threshold);
  const votingPublicKey = genPubKey(coefficients[0]);
  const keypairs = Array.from({ length: N }, (_, i) => genKeypair());
  const r1 = Array.from({ length: N }, (_, i) => genRandomSalt());
  const r2 = Array.from({ length: N }, (_, i) => genRandomSalt());
  const shares = Array.from({ length: N }, (_, i) => {
    const share = sss.evalPolynomialZ(coefficients, BigInt(i + 1))
    return share
  })
  const ciphertexts = shares.map((share, i): ElGamalCiphertext => {
    return encryptShare(share, keypairs[i].pubKey, r1[i], r2[i])
  })
  const input: PVSSCircuitInput = {
    coefficients,
    r1,
    r2,
    guardiansPubKeys: keypairs.map((key) => key.pubKey.map(F.toBigint)),
    votingPublicKey: votingPublicKey.map(F.toBigint),
    encryptedShares: ciphertexts.map((ciphertext) => {
      return [
        ciphertext.c1[0], ciphertext.c1[1],
        ciphertext.c2[0], ciphertext.c2[1],
        ciphertext.xIncrement].map(F.toBigint)
    })
  }

  const CIRCUIT_NAME = `pvss_${threshold}_of_${N}`
  const CIRCUIT_CONFIG = {
    file: "pvss",
    template: "PVSS",
    pubs: ["guardiansPubKeys"],
    params: [N, threshold],
  }

  before(async () => {
      await circomkit.compile(CIRCUIT_NAME, CIRCUIT_CONFIG)
      const info = await circomkit.info(CIRCUIT_NAME)
  })

  describe(`test witness generation ${CIRCUIT_NAME}`, () => {
    let circuit: WitnessTester<["coefficients", "r1", "r2", "guardiansPubKeys"], ["out", "votingPublicKey"]>;

    before(async () => {
      circuit = await circomkit.WitnessTester(CIRCUIT_NAME, CIRCUIT_CONFIG);
    });

    it("should have correct number of constraints", async () => {
      await circuit.expectConstraintCount(42212);
    });
    it("should encrypt correctly", async () => {
      for (let i = 0; i < N; i++) {
        const share = shares[i]
        const message = encryptShare(share, keypairs[i].pubKey, r1[i], r2[i])
        const decoded = decryptShare(keypairs[i].privKey, message)

        assert(share == decoded, `[${i}] share ${share} != decoded ${decoded}`)
      }
    })
    it.only("should distribute encrypted shares", async () => {
      await circuit.expectPass(input);
    });
  });

  describe(`test ${CIRCUIT_NAME} proof generation`, () => {
    let circuit: ProofTester<["coefficients", "r1", "r2", "guardiansPubKeys"]>;

    before(async () => {
      circuit = await circomkit.ProofTester(CIRCUIT_NAME);
    });

    it.only("should verify a proof correctly", async () => {
      await measureTime("Proof generation", async () => {
        const { proof, publicSignals } = await circuit.prove(input)
        await circuit.expectPass(proof, publicSignals)
      })
    });
    it('should NOT verify a proof with invalid public signals', async () => {
      const { proof, publicSignals } = await circuit.prove(input);
      await circuit.expectFail(proof, ['1']);
    });
  });
})

describe("single PVSS for 3-of-4 access structure", () => {
  const N = 1;
  const threshold = 3;
  const coefficients = sss.randomPolynomialZ(threshold);
  const votingPublicKey = genPubKey(coefficients[0]);
  const keypairs = Array.from({ length: N }, (_, i) => genKeypair());
  const r1 = Array.from({ length: N }, (_, i) => genRandomSalt());
  const r2 = Array.from({ length: N }, (_, i) => genRandomSalt());

  const shares = Array.from({ length: N }, (_, i) => {
    const share = sss.evalPolynomialZ(coefficients, BigInt(i + 1))
    return share
  })

  const ciphertexts = shares.map((share, i): ElGamalCiphertext => {
    return encryptShare(share, keypairs[i].pubKey, r1[i], r2[i])
  })

  const input: PVSSCircuitInput = {
    coefficients,
    r1,
    r2,
    guardiansPubKeys: keypairs.map((key) => key.pubKey.map(F.toBigint)),
    votingPublicKey: votingPublicKey.map(F.toBigint),
    encryptedShares: ciphertexts.map((ciphertext) => {
      return [
        ciphertext.c1[0], ciphertext.c1[1],
        ciphertext.c2[0], ciphertext.c2[1],
        ciphertext.xIncrement].map(F.toBigint)
    })
  }

  const CIRCUIT_NAME = "pvss_1"
  const CIRCUIT_CONFIG = {
    file: "pvss",
    template: "PVSS",
    pubs: ["guardiansPubKeys"],
    params: [N, threshold],
  }

  before(async () => {
      await circomkit.compile(CIRCUIT_NAME, CIRCUIT_CONFIG)
      const info = await circomkit.info(CIRCUIT_NAME)
  })
  describe(`test witness generation ${CIRCUIT_NAME}`, () => {
    let circuit: WitnessTester<["coefficients", "r1", "r2", "guardiansPubKeys"], ["votingPublicKey","out"]>;

    before(async () => {
      circuit = await circomkit.WitnessTester(CIRCUIT_NAME, CIRCUIT_CONFIG);
    });

    it("should have correct number of constraints", async () => {
      await circuit.expectConstraintCount(10807);
    });
    it("should encrypt correctly", async () => {
      for (let i = 0; i < N; i++) {
        const share = shares[i]
        const message = encryptShare(share, keypairs[i].pubKey, r1[i], r2[i])
        const decoded = decryptShare(keypairs[i].privKey, message)

        assert(share == decoded)
      }
    })
    it("should distribute encrypted shares", async () => {
      await circuit.expectPass(input);
    });
  });

  describe(`test ${CIRCUIT_NAME} proof generation`, () => {
    let circuit: ProofTester<["coefficients", "r1", "r2", "guardiansPubKeys"]>;

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
      const { proof, publicSignals } = await circuit.prove(input);
      await circuit.expectFail(proof, ['1']);
    });
  });
})