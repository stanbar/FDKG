/**
 * Shared TypeScript types for the FDKG-Vote-BC PoC webapp.
 *
 * These mirror the Solidity struct definitions in FDKGVoteGW.sol so that
 * the webapp and the contract stay in sync.
 */

// ─── On-chain struct mirrors ────────────────────────────────────────────────

/** A BabyJub curve point. */
export interface Point {
  x: bigint;
  y: bigint;
}

/** ElGamal ciphertext of a Shamir share. */
export interface EncShare {
  c1: Point;
  c2: Point;
  xIncrement: bigint;
}

/** An encrypted ballot. */
export interface Ballot {
  c1: Point;
  c2: Point;
  nullifier: `0x${string}`;
}

/** A partial decryption contribution. PD_i = sk_i · aggC1 */
export interface DecShare {
  tallier: `0x${string}`;
  share: Point;
}

/** A guardian's plaintext Shamir share for an offline tallier. */
export interface ReconShare {
  tallier: `0x${string}`;
  guardian: `0x${string}`;
  shareX: bigint;
  shareY: bigint;
}

/** Summary of an election returned by getElectionInfo(). */
export interface ElectionInfo {
  organiser: `0x${string}`;
  tOpen: bigint;
  tClose: bigint;
  tRec: number;
  merkleRoot: `0x${string}`;
  paramsPinned: boolean;
  tallyFinalized: boolean;
  electionPkX: bigint;
  electionPkY: bigint;
  ballotCount: bigint;
  decShareCount: bigint;
  tallierCount: bigint;
}

// ─── Off-chain crypto types ─────────────────────────────────────────────────

/** A tallier's keypair (BabyJub). */
export interface TallierKeypair {
  privKey: bigint;
  pubKey: [Uint8Array, Uint8Array]; // BabyJubPoint
}

/** Result of FDKG Round 1 generation for a single tallier. */
export interface FDKGGenResult {
  /** Partial public key E_i = Base8^sk_i */
  Ei: Point;
  /** Guardian addresses (in order). */
  guardians: `0x${string}`[];
  /** Encrypted Shamir shares — one per guardian. */
  encShares: EncShare[];
  /** Mock NIZK proof (empty bytes in PoC). */
  proof: `0x${string}`;
}

/** Material used for off-chain tally computation. */
export interface DecryptionMaterial {
  /** tallier address → PD_i (Point) */
  directShares: Map<string, Point>;
  /** tallier address → list of guardian recon shares */
  reconShares: Map<string, ReconShare[]>;
  /** tallier address → partial secret key (reconstructed or provided directly) */
  partialSecrets: Map<string, bigint>;
}

/** Election parameters used locally during a session. */
export interface SessionElection {
  eid: `0x${string}`;
  electionPubKey: Point;
  numVoters: number;
  numOptions: number;
}
