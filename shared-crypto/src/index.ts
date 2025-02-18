/// <reference path='./types.d.ts'/>

import * as F from "./F.js";
// import * as Z from "./Z.js";
import { babyjub, genPrivKey, genPubKey, genKeypair, formatPrivKeyForBabyJub, genRandomSalt, SNARK_FIELD_SIZE, addPoint, mulPointEscalar, Base8, PrivKey, PubKey, Keypair, inCurve } from "./babyjub.js";
import { encryptBallot, decryptBallot, decryptResults, decryptBallotMpc } from "./ballot.js";
import { scalarToPoint, encryptShare, pointToScalar, decryptShare, ElGamalCiphertext, Message } from "./encryption.js";
import { Proof, PublicSignals, PVSSCircuitInput, BallotCircuitInput, PartialDecryptionCircuitInput } from "./proof.js"
import type { BabyJubPoint, FFieldElement, ZFieldElement } from "./types.js";
import { evalPolynomialZ, randomPolynomialZ } from "./sss.js";
import * as sss from "./sss.js";
import * as fkdg from "./fdkg.js"
import type { Share } from "./fdkg.js";


// const BABYJUB_BASE_ORDER = Z.BABYJUB_BASE_ORDER
const PointZero = F.PointZero
const LagrangeCoefficient = sss.LagrangeCoefficient
const recoverZ = sss.recoverZ

// export { Z, BABYJUB_BASE_ORDER }
export { sss, fkdg, PointZero, LagrangeCoefficient }
export { evalPolynomialZ, randomPolynomialZ, recoverZ }
export { F, babyjub, genPrivKey, genPubKey, genKeypair, inCurve, formatPrivKeyForBabyJub, genRandomSalt, SNARK_FIELD_SIZE, addPoint, mulPointEscalar, Base8 };
export { scalarToPoint, decryptBallotMpc, encryptShare, pointToScalar, decryptShare };
export { decryptBallot, encryptBallot, decryptResults };


export type {
  Share,
  FFieldElement,
  ZFieldElement,
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
