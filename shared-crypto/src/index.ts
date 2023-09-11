/// <reference path='./types.d.ts'/>

import * as F from "./F.js";
import { babyjub, genPrivKey, genPubKey, genKeypair, formatPrivKeyForBabyJub, genRandomSalt, SNARK_FIELD_SIZE, addPoint, mulPointEscalar, Base8, BabyJubPoint, PrivKey, PubKey, Keypair } from "./babyjub.js";
import { encryptBallot, decryptBallot, decryptResults } from "./ballot.js";
import { scalarToPoint, encryptShare, pointToScalar, decryptShare, ElGamalCiphertext, Message } from "./encryption.js";
import { Proof, PublicSignals, PVSSCircuitInput, BallotCircuitInput, PartialDecryptionCircuitInput } from "./proof.js"

export { F, babyjub, genPrivKey, genPubKey, genKeypair, formatPrivKeyForBabyJub, genRandomSalt, SNARK_FIELD_SIZE, addPoint, mulPointEscalar, Base8 };
export { scalarToPoint, encryptShare, pointToScalar, decryptShare };
export { decryptBallot, encryptBallot, decryptResults };

export type {
  Keypair,
  PrivKey,
  PubKey,
  ElGamalCiphertext,
  Message,
  BabyJubPoint,
  Proof,
  PublicSignals,
  PVSSCircuitInput, 
  BallotCircuitInput, 
  PartialDecryptionCircuitInput
}

export const randomPolynomial = (threshold: number, secret?: PrivKey): bigint[] => {
  const coefficients = Array.from({ length: threshold }, (_, i) => genRandomSalt());
  if (secret) coefficients[0] = secret;
  return coefficients as bigint[];
}

export const evalPolynomial = (coefficients: bigint[], x: bigint): bigint => {
  let result = coefficients[0];
  for (let i = 1; i < coefficients.length; i++) {
    result += coefficients[i] * (x ** BigInt(i)) % SNARK_FIELD_SIZE;
  }
  return result % SNARK_FIELD_SIZE;
}