/**
 * crypto.ts — Off-chain cryptographic operations for FDKG-Vote-BC.
 *
 * Wraps the existing shared-crypto package (BabyJub ElGamal + SSS + ballot encoding).
 * All heavy crypto runs off-chain; results are submitted to the contract.
 *
 * MOCKED in PoC:
 *   - NIZK proofs:     all proof params return `"0x"` (empty bytes)
 *   - Nullifier:       keccak256(privKey ‖ eid ‖ "cast")  (no ZK)
 *   - Eligibility key: voter's Ethereum private key is also their voting key
 *
 * Replacement hooks:
 *   - Replace mock proof generation with actual circom prove() calls
 *   - Replace keccak nullifier with Poseidon-based NIZK nullifier circuit
 */

import { keccak256, encodePacked, type Hex } from "viem";
import type {
  Point,
  EncShare,
  FDKGGenResult,
  DecryptionMaterial,
  ReconShare,
} from "./types";

// Lazily initialised shared-crypto module (requires async WASM init)
let _crypto: Awaited<ReturnType<typeof importCrypto>> | null = null;

async function importCrypto() {
  const sc = await import("shared-crypto");
  return sc;
}

async function getCrypto() {
  if (!_crypto) {
    _crypto = await importCrypto();
  }
  return _crypto;
}

// ─── BabyJub helpers ────────────────────────────────────────────────────────

/** Convert a BabyJubPoint [Uint8Array, Uint8Array] to our Point (bigint, bigint). */
export function bjjToPoint(p: [Uint8Array, Uint8Array]): Point {
  const { F } = require("shared-crypto");
  return { x: F.toBigint(p[0]), y: F.toBigint(p[1]) };
}

/**
 * Convert a shared-crypto BabyJubPoint to our Point type.
 * Works both sync (if WASM already loaded) and after async init.
 */
function pointFromBjj(bjjPoint: any, F: any): Point {
  return { x: BigInt(F.toBigint(bjjPoint[0])), y: BigInt(F.toBigint(bjjPoint[1])) };
}

// ─── Key generation ──────────────────────────────────────────────────────────

/**
 * Generate a fresh tallier keypair (BabyJub scalar + public key).
 */
export async function generateTallierKeypair(): Promise<{
  privKey: bigint;
  pubKeyBjj: any;
  pubKey: Point;
}> {
  const sc = await getCrypto();
  // The SSS library requires secret < BABYJUB_BASE8_ORDER (~2^251.7).
  // formatPrivKeyForBabyJub returns values in [2^251, 2^252), so ~2/3 of them
  // would exceed the SSS field. Instead, derive the key as the constant term of
  // a degree-0 random polynomial, which is guaranteed < BABYJUB_BASE8_ORDER.
  const poly = sc.sss.randomPolynomialZ(1); // [random in [0, BASE8_ORDER)]
  const privKey: bigint = poly[0] as bigint;
  const pubKeyBjj = sc.genPubKey(privKey);
  const pubKey = pointFromBjj(pubKeyBjj, sc.F);
  return { privKey, pubKeyBjj, pubKey };
}

/**
 * Derive a voter keypair from their Ethereum private key.
 * (MOCK: in production voters have independent election keypairs registered in merkleRoot)
 */
export async function deriveVoterKeypair(ethPrivKey: bigint): Promise<{
  privKey: bigint;
  pubKey: Point;
}> {
  const sc = await getCrypto();
  const privKey = sc.formatPrivKeyForBabyJub(ethPrivKey);
  const pubKeyBjj = sc.genPubKey(privKey);
  return { privKey, pubKey: pointFromBjj(pubKeyBjj, sc.F) };
}

// ─── FDKG Round 1: Generation ────────────────────────────────────────────────

/**
 * FDKG Round 1 for one tallier (05a-fdkg-protocol.tex §subsubsec:fdkg_round1).
 *
 * Steps:
 *  1. Guardian selection (provided externally).
 *  2. Partial key: E_i = Base8^sk_i  (already computed as pubKey).
 *  3. Shamir split sk_i into k shares.
 *  4. Encrypt each share to the corresponding guardian's public key.
 *  5. MOCK: return empty proof bytes.
 *
 * @param privKey       sk_i (BabyJub scalar).
 * @param guardianAddrs Guardian Ethereum addresses (ordering = Shamir x-coordinates).
 * @param guardianPubKeys BabyJub public keys of guardians (corresponding to guardianAddrs).
 * @param tRec          Reconstruction threshold.
 */
export async function fdkgGenerate(
  privKey: bigint,
  pubKey: Point,
  guardianAddrs: `0x${string}`[],
  guardianPubKeys: [Uint8Array, Uint8Array][],
  tRec: number
): Promise<FDKGGenResult> {
  const sc = await getCrypto();
  const k = guardianAddrs.length;

  // Shamir secret sharing of sk_i into k shares with threshold tRec
  const polynomial = sc.sss.randomPolynomialZ(tRec, privKey);
  const plaintextShares = sc.sss.generateSharesZ(polynomial, k);

  // Encrypt each share to the corresponding guardian
  const encShares: EncShare[] = plaintextShares.map((share, i) => {
    const r1 = sc.genRandomSalt();
    const r2 = sc.genRandomSalt();
    const ct = sc.encryptShare(share.y, guardianPubKeys[i], r1, r2);
    return {
      c1: pointFromBjj(ct.c1, sc.F),
      c2: pointFromBjj(ct.c2, sc.F),
      xIncrement: BigInt(sc.F.toBigint(ct.xIncrement)),
    };
  });

  return {
    Ei: pubKey,
    guardians: guardianAddrs,
    encShares,
    proof: "0x", // MOCK: empty proof
  };
}

// ─── Ballot encryption ───────────────────────────────────────────────────────

/**
 * Encrypt a vote choice under the election public key E.
 *
 * Returns (c1, c2) as BabyJub points where:
 *   c1 = r · Base8
 *   c2 = m · Base8 + r · E   (m = 2^((choice-1)*mBits) encodes the choice)
 */
export async function encryptVote(
  electionPubKey: Point,
  choice: number,
  numVoters: number,
  numOptions: number
): Promise<{ c1: Point; c2: Point; r: bigint }> {
  const sc = await getCrypto();

  // Convert election public key back to BabyJub point format
  const E = [sc.F.e(electionPubKey.x), sc.F.e(electionPubKey.y)] as [Uint8Array, Uint8Array];

  const r = sc.genRandomSalt();
  const [c1Bjj, c2Bjj] = sc.encryptBallot(E, BigInt(choice), r, numVoters, numOptions);

  return {
    c1: pointFromBjj(c1Bjj, sc.F),
    c2: pointFromBjj(c2Bjj, sc.F),
    r,
  };
}

// ─── Nullifier ───────────────────────────────────────────────────────────────

/**
 * Compute the cast nullifier.
 *   nf_u = keccak256(sk_u ‖ eid ‖ "cast")
 *
 * MOCK: uses keccak256 instead of a Poseidon-based ZK nullifier circuit.
 * Replacement: implement a Poseidon hash inside the cast ZK circuit so the
 * nullifier is derived without revealing sk_u.
 */
export function computeNullifier(privKey: bigint, eid: Hex): Hex {
  return keccak256(encodePacked(["uint256", "bytes32", "string"], [privKey, eid, "cast"]));
}

// ─── Aggregate ciphertexts ────────────────────────────────────────────────────

/**
 * Aggregate all ballot ciphertexts (homomorphic sum).
 *   aggC1 = ∑ c1_u   (BabyJub point addition)
 *   aggC2 = ∑ c2_u
 */
export async function computeAggregateC(
  ballots: { c1: Point; c2: Point }[]
): Promise<{ aggC1: Point; aggC2: Point }> {
  if (ballots.length === 0) {
    throw new Error("No ballots to aggregate");
  }

  const sc = await getCrypto();

  const toBjj = (p: Point) => [sc.F.e(p.x), sc.F.e(p.y)] as [Uint8Array, Uint8Array];

  const c1s = ballots.map((b) => toBjj(b.c1));
  const c2s = ballots.map((b) => toBjj(b.c2));

  const aggC1Bjj = c1s.slice(1).reduce(sc.addPoint, c1s[0]);
  const aggC2Bjj = c2s.slice(1).reduce(sc.addPoint, c2s[0]);

  return {
    aggC1: pointFromBjj(aggC1Bjj, sc.F),
    aggC2: pointFromBjj(aggC2Bjj, sc.F),
  };
}

// ─── Partial decryption ───────────────────────────────────────────────────────

/**
 * Compute partial decryption: PD_i = sk_i · aggC1.
 *
 * @param privKey  sk_i (tallier's partial secret key).
 * @param aggC1    Aggregate first ciphertext component.
 */
export async function computePartialDecryption(
  privKey: bigint,
  aggC1: Point
): Promise<Point> {
  const sc = await getCrypto();
  const c1Bjj = [sc.F.e(aggC1.x), sc.F.e(aggC1.y)] as [Uint8Array, Uint8Array];
  const pdBjj = sc.mulPointEscalar(c1Bjj, privKey);
  return pointFromBjj(pdBjj, sc.F);
}

// ─── Guardian: decrypt a share ───────────────────────────────────────────────

/**
 * Guardian decrypts the encrypted Shamir share they hold for an offline tallier.
 * Returns the plaintext (shareX, shareY) pair.
 *
 * @param guardianPrivKey  Guardian's BabyJub private key.
 * @param enc              Encrypted share (ElGamal ciphertext).
 * @param shareX           Shamir x-index (= 1-based guardian position).
 */
export async function decryptShareForGuardian(
  guardianPrivKey: bigint,
  enc: EncShare,
  shareX: number
): Promise<{ shareX: number; shareY: bigint }> {
  const sc = await getCrypto();
  const ct = {
    c1: [sc.F.e(enc.c1.x), sc.F.e(enc.c1.y)] as [Uint8Array, Uint8Array],
    c2: [sc.F.e(enc.c2.x), sc.F.e(enc.c2.y)] as [Uint8Array, Uint8Array],
    xIncrement: sc.F.e(enc.xIncrement),
  };
  const shareY = sc.decryptShare(guardianPrivKey, ct);
  return { shareX, shareY };
}

// ─── Off-chain tally computation ─────────────────────────────────────────────

/**
 * Compute the final tally from on-chain data (alg:fdkg-tally).
 *
 * Algorithm:
 *  1. Aggregate:  A = ∑ c1_u,  B = ∑ c2_u
 *  2. For each tallier i:
 *       - If decShare available: use PD_i directly.
 *       - Else: reconstruct sk_i from guardian shares via Lagrange SSS,
 *               compute PD_i = sk_i · A.
 *  3. Combine: D = ∑ PD_i  (BabyJub addition)
 *  4. M = B − D  (negate D then add: M = B + (−D))
 *  5. Discrete log: decryptResults(A, B_after_strip, numVoters, numOptions)
 *     (Uses exhaustive search over all possible tally combinations.)
 *
 * @param decMat      Available direct and guardian reconstruction shares.
 * @param ballots     All accepted ballots.
 * @param tallierPartialKeys  Map of tallier address → partial public key (for verification).
 * @param numVoters   Upper bound for exhaustive search.
 * @param numOptions  Number of voting options.
 */
export async function computeTally(
  decMat: DecryptionMaterial,
  ballots: { c1: Point; c2: Point }[],
  numVoters: number,
  numOptions: number
): Promise<bigint[]> {
  if (ballots.length === 0) return new Array(numOptions).fill(0n);

  const sc = await getCrypto();

  // 1. Aggregate ciphertexts
  const { aggC1, aggC2 } = await computeAggregateC(ballots);
  const aggC1Bjj = [sc.F.e(aggC1.x), sc.F.e(aggC1.y)] as [Uint8Array, Uint8Array];

  // 2+3. Collect partial decryptions, reconstruct missing ones from guardian shares
  const pdList: [Uint8Array, Uint8Array][] = [];

  for (const [tallierAddr, pd] of decMat.directShares) {
    const pdBjj = [sc.F.e(pd.x), sc.F.e(pd.y)] as [Uint8Array, Uint8Array];
    pdList.push(pdBjj);
  }

  for (const [tallierAddr, shares] of decMat.reconShares) {
    if (decMat.directShares.has(tallierAddr)) continue; // already have direct share

    if (shares.length === 0) continue;

    // Reconstruct sk_i via Lagrange SSS
    const recoverShares = shares.map((s) => ({ x: Number(s.shareX), y: s.shareY }));
    const skRecovered = sc.sss.recoverZ(recoverShares, recoverShares.length, recoverShares.length);

    // PD_i = sk_i · aggC1
    const pdBjj = sc.mulPointEscalar(aggC1Bjj, skRecovered);
    pdList.push(pdBjj as [Uint8Array, Uint8Array]);
  }

  if (pdList.length === 0) {
    throw new Error("No decryption material available");
  }

  // 4. D = ∑ PD_i
  const D = pdList.slice(1).reduce(sc.addPoint, pdList[0]);

  // 5. M = B − D = aggC2 + (−D)
  //    Negation of a twisted-Edwards point (x,y): (−x, y)
  const Dx = sc.F.toBigint(D[0]);
  const Dy = sc.F.toBigint(D[1]);
  const negDx = sc.F.neg(sc.F.e(Dx));
  const negD = [negDx, D[1]] as [Uint8Array, Uint8Array];

  const aggC2Bjj = [sc.F.e(aggC2.x), sc.F.e(aggC2.y)] as [Uint8Array, Uint8Array];
  const M = sc.addPoint(aggC2Bjj, negD);

  // 6. Discrete log via exhaustive search (decryptResults uses baby-step approach)
  //    Signature: decryptResults(c1r, c2, voters, options) where c1r is the
  //    combined decryption factor and c2 is the stripped ciphertext.
  //    Here we pass M directly (M = m·Base8 = stripped message point) and
  //    a zero C2 equivalent by using a different API path.
  //
  //    The shared-crypto decryptBallotMpc(c1r, c2, voters, options) computes:
  //      mG = c2 + (-c1r) = m·Base8
  //    We want to pass c1r=D, c2=aggC2, which gives m·Base8 = aggC2 - D = M. ✓
  const aggC2BjjMpc = [sc.F.e(aggC2.x), sc.F.e(aggC2.y)] as [Uint8Array, Uint8Array];

  // decryptResults: returns array of vote counts per option
  const tally = sc.decryptResults(D as [Uint8Array, Uint8Array], aggC2BjjMpc, numVoters, numOptions);
  return tally as bigint[];
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Format a bigint as a 0x-prefixed 32-byte hex string. */
export function toBytes32(n: bigint): `0x${string}` {
  return `0x${n.toString(16).padStart(64, "0")}`;
}

/** Parse a Point from a contract-returned tuple [bigint, bigint]. */
export function parsePoint(x: bigint, y: bigint): Point {
  return { x, y };
}
