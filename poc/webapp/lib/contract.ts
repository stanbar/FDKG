/**
 * contract.ts — viem ABI and read/write helpers for FDKGVoteGW.
 *
 * Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local to the deployed address.
 * Set NEXT_PUBLIC_RPC_URL for the RPC endpoint (default: http://localhost:8545).
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  type Hash,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { foundry } from "viem/chains";
import type {
  Ballot,
  DecShare,
  ReconShare,
  ElectionInfo,
  EncShare,
  Point,
} from "./types";

// ─── Chain / transport config ─────────────────────────────────────────────────

const RPC_URL =
  (typeof window !== "undefined" && process.env.NEXT_PUBLIC_RPC_URL) ||
  "http://localhost:8545";

export function getPublicClient(): PublicClient {
  return createPublicClient({
    chain: foundry,
    transport: http(RPC_URL),
  });
}

export function getWalletClient(account: Address): WalletClient {
  // In browser: use window.ethereum; in scripts: caller injects private key
  const transport =
    typeof window !== "undefined" && (window as any).ethereum
      ? custom((window as any).ethereum)
      : http(RPC_URL);

  return createWalletClient({
    chain: foundry,
    transport,
    account,
  });
}

// ─── Contract address ─────────────────────────────────────────────────────────

export function getContractAddress(): Address {
  const addr = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!addr) {
    throw new Error(
      "NEXT_PUBLIC_CONTRACT_ADDRESS not set — deploy the contract first."
    );
  }
  return addr as Address;
}

// ─── ABI ──────────────────────────────────────────────────────────────────────

export const FDKG_ABI = [
  // pinParams
  {
    type: "function",
    name: "pinParams",
    inputs: [
      { name: "eid",        type: "bytes32" },
      { name: "tOpen",      type: "uint64"  },
      { name: "tClose",     type: "uint64"  },
      { name: "tRec",       type: "uint16"  },
      { name: "merkleRoot", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // addEligible
  {
    type: "function",
    name: "addEligible",
    inputs: [
      { name: "eid",    type: "bytes32"   },
      { name: "voters", type: "address[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // postFDKGGen
  {
    type: "function",
    name: "postFDKGGen",
    inputs: [
      { name: "eid",         type: "bytes32" },
      {
        name: "Ei", type: "tuple",
        components: [{ name: "x", type: "uint256" }, { name: "y", type: "uint256" }],
      },
      { name: "guardianSet", type: "address[]" },
      {
        name: "shares", type: "tuple[]",
        components: [
          {
            name: "c1", type: "tuple",
            components: [{ name: "x", type: "uint256" }, { name: "y", type: "uint256" }],
          },
          {
            name: "c2", type: "tuple",
            components: [{ name: "x", type: "uint256" }, { name: "y", type: "uint256" }],
          },
          { name: "xIncrement", type: "uint256" },
        ],
      },
      { name: "proof", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // castBallot
  {
    type: "function",
    name: "castBallot",
    inputs: [
      { name: "eid",      type: "bytes32" },
      {
        name: "c1", type: "tuple",
        components: [{ name: "x", type: "uint256" }, { name: "y", type: "uint256" }],
      },
      {
        name: "c2", type: "tuple",
        components: [{ name: "x", type: "uint256" }, { name: "y", type: "uint256" }],
      },
      { name: "nullifier", type: "bytes32" },
      { name: "proof",     type: "bytes"   },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // postDecShare
  {
    type: "function",
    name: "postDecShare",
    inputs: [
      { name: "eid",   type: "bytes32" },
      {
        name: "share", type: "tuple",
        components: [{ name: "x", type: "uint256" }, { name: "y", type: "uint256" }],
      },
      { name: "proof", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // postReconShare
  {
    type: "function",
    name: "postReconShare",
    inputs: [
      { name: "eid",     type: "bytes32" },
      { name: "tallier", type: "address" },
      { name: "shareX",  type: "uint256" },
      { name: "shareY",  type: "uint256" },
      { name: "proof",   type: "bytes"   },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // finalizeTally
  {
    type: "function",
    name: "finalizeTally",
    inputs: [
      { name: "eid",         type: "bytes32"   },
      { name: "tallyResult", type: "uint256[]" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  // getElectionInfo
  {
    type: "function",
    name: "getElectionInfo",
    inputs: [{ name: "eid", type: "bytes32" }],
    outputs: [
      { name: "organiser",      type: "address" },
      { name: "tOpen",          type: "uint64"  },
      { name: "tClose",         type: "uint64"  },
      { name: "tRec",           type: "uint16"  },
      { name: "merkleRoot",     type: "bytes32" },
      { name: "paramsPinned",   type: "bool"    },
      { name: "tallyFinalized", type: "bool"    },
      { name: "electionPkX",    type: "uint256" },
      { name: "electionPkY",    type: "uint256" },
      { name: "ballotCount",    type: "uint256" },
      { name: "decShareCount",  type: "uint256" },
      { name: "tallierCount",   type: "uint256" },
    ],
    stateMutability: "view",
  },
  // getBallots
  {
    type: "function",
    name: "getBallots",
    inputs: [{ name: "eid", type: "bytes32" }],
    outputs: [
      {
        name: "", type: "tuple[]",
        components: [
          {
            name: "c1", type: "tuple",
            components: [{ name: "x", type: "uint256" }, { name: "y", type: "uint256" }],
          },
          {
            name: "c2", type: "tuple",
            components: [{ name: "x", type: "uint256" }, { name: "y", type: "uint256" }],
          },
          { name: "nullifier", type: "bytes32" },
        ],
      },
    ],
    stateMutability: "view",
  },
  // getDecShares
  {
    type: "function",
    name: "getDecShares",
    inputs: [{ name: "eid", type: "bytes32" }],
    outputs: [
      {
        name: "", type: "tuple[]",
        components: [
          { name: "tallier", type: "address" },
          {
            name: "share", type: "tuple",
            components: [{ name: "x", type: "uint256" }, { name: "y", type: "uint256" }],
          },
        ],
      },
    ],
    stateMutability: "view",
  },
  // getReconShares
  {
    type: "function",
    name: "getReconShares",
    inputs: [{ name: "eid", type: "bytes32" }],
    outputs: [
      {
        name: "", type: "tuple[]",
        components: [
          { name: "tallier",  type: "address" },
          { name: "guardian", type: "address" },
          { name: "shareX",   type: "uint256" },
          { name: "shareY",   type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  // getTallierList
  {
    type: "function",
    name: "getTallierList",
    inputs: [{ name: "eid", type: "bytes32" }],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  // getTallyResult
  {
    type: "function",
    name: "getTallyResult",
    inputs: [{ name: "eid", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256[]" }],
    stateMutability: "view",
  },
  // getGuardians
  {
    type: "function",
    name: "getGuardians",
    inputs: [
      { name: "eid",     type: "bytes32" },
      { name: "tallier", type: "address" },
    ],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  // getEncShares
  {
    type: "function",
    name: "getEncShares",
    inputs: [
      { name: "eid",     type: "bytes32" },
      { name: "tallier", type: "address" },
    ],
    outputs: [
      {
        name: "", type: "tuple[]",
        components: [
          {
            name: "c1", type: "tuple",
            components: [{ name: "x", type: "uint256" }, { name: "y", type: "uint256" }],
          },
          {
            name: "c2", type: "tuple",
            components: [{ name: "x", type: "uint256" }, { name: "y", type: "uint256" }],
          },
          { name: "xIncrement", type: "uint256" },
        ],
      },
    ],
    stateMutability: "view",
  },
  // getPartialPubKey
  {
    type: "function",
    name: "getPartialPubKey",
    inputs: [
      { name: "eid",     type: "bytes32" },
      { name: "tallier", type: "address" },
    ],
    outputs: [
      { name: "pkX", type: "uint256" },
      { name: "pkY", type: "uint256" },
    ],
    stateMutability: "view",
  },
  // enoughDecMaterial
  {
    type: "function",
    name: "enoughDecMaterial",
    inputs: [{ name: "eid", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  // ── Mappings (public getters) ──
  {
    type: "function",
    name: "eligible",
    inputs: [{ name: "", type: "bytes32" }, { name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isTallier",
    inputs: [{ name: "", type: "bytes32" }, { name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "decPosted",
    inputs: [{ name: "", type: "bytes32" }, { name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "reconCount",
    inputs: [{ name: "", type: "bytes32" }, { name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  // ── Events ──
  {
    type: "event",
    name: "ParamsPinned",
    inputs: [
      { name: "eid",        type: "bytes32", indexed: true  },
      { name: "organiser",  type: "address", indexed: true  },
      { name: "tOpen",      type: "uint64",  indexed: false },
      { name: "tClose",     type: "uint64",  indexed: false },
      { name: "tRec",       type: "uint16",  indexed: false },
      { name: "merkleRoot", type: "bytes32", indexed: false },
    ],
  },
  {
    type: "event",
    name: "FDKGAccepted",
    inputs: [
      { name: "eid",     type: "bytes32", indexed: true  },
      { name: "tallier", type: "address", indexed: true  },
      { name: "pkX",     type: "uint256", indexed: false },
      { name: "pkY",     type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BallotAccepted",
    inputs: [
      { name: "eid",      type: "bytes32", indexed: true },
      { name: "nullifier",type: "bytes32", indexed: true },
    ],
  },
  {
    type: "event",
    name: "TallyFinalized",
    inputs: [
      { name: "eid",   type: "bytes32",   indexed: true  },
      { name: "tally", type: "uint256[]", indexed: false },
    ],
  },
] as const;

// ─── Read helpers ─────────────────────────────────────────────────────────────

const cfg = () => ({
  address: getContractAddress(),
  abi: FDKG_ABI,
});

export async function readElection(
  client: PublicClient,
  eid: Hex
): Promise<ElectionInfo> {
  const result = await client.readContract({
    ...cfg(),
    functionName: "getElectionInfo",
    args: [eid],
  });
  const [
    organiser, tOpen, tClose, tRec, merkleRoot,
    paramsPinned, tallyFinalized,
    electionPkX, electionPkY,
    ballotCount, decShareCount, tallierCount,
  ] = result as readonly [
    Address, bigint, bigint, number, Hex,
    boolean, boolean,
    bigint, bigint,
    bigint, bigint, bigint
  ];
  return {
    organiser, tOpen, tClose, tRec, merkleRoot,
    paramsPinned, tallyFinalized,
    electionPkX, electionPkY,
    ballotCount, decShareCount, tallierCount,
  };
}

export async function readBallots(
  client: PublicClient,
  eid: Hex
): Promise<Ballot[]> {
  const raw = await client.readContract({
    ...cfg(),
    functionName: "getBallots",
    args: [eid],
  }) as any[];
  return raw.map((b: any) => ({
    c1: { x: b.c1.x, y: b.c1.y },
    c2: { x: b.c2.x, y: b.c2.y },
    nullifier: b.nullifier,
  }));
}

export async function readDecShares(
  client: PublicClient,
  eid: Hex
): Promise<DecShare[]> {
  const raw = await client.readContract({
    ...cfg(),
    functionName: "getDecShares",
    args: [eid],
  }) as any[];
  return raw.map((d: any) => ({
    tallier: d.tallier,
    share: { x: d.share.x, y: d.share.y },
  }));
}

export async function readReconShares(
  client: PublicClient,
  eid: Hex
): Promise<ReconShare[]> {
  const raw = await client.readContract({
    ...cfg(),
    functionName: "getReconShares",
    args: [eid],
  }) as any[];
  return raw.map((r: any) => ({
    tallier: r.tallier,
    guardian: r.guardian,
    shareX: r.shareX,
    shareY: r.shareY,
  }));
}

export async function readTallierList(
  client: PublicClient,
  eid: Hex
): Promise<Address[]> {
  return client.readContract({
    ...cfg(),
    functionName: "getTallierList",
    args: [eid],
  }) as Promise<Address[]>;
}

export async function readTally(
  client: PublicClient,
  eid: Hex
): Promise<bigint[]> {
  return client.readContract({
    ...cfg(),
    functionName: "getTallyResult",
    args: [eid],
  }) as Promise<bigint[]>;
}

export async function readEncShares(
  client: PublicClient,
  eid: Hex,
  tallier: Address
): Promise<EncShare[]> {
  const raw = await client.readContract({
    ...cfg(),
    functionName: "getEncShares",
    args: [eid, tallier],
  }) as any[];
  return raw.map((e: any) => ({
    c1: { x: e.c1.x, y: e.c1.y },
    c2: { x: e.c2.x, y: e.c2.y },
    xIncrement: e.xIncrement,
  }));
}

export async function readEnoughDecMaterial(
  client: PublicClient,
  eid: Hex
): Promise<boolean> {
  return client.readContract({
    ...cfg(),
    functionName: "enoughDecMaterial",
    args: [eid],
  }) as Promise<boolean>;
}

// ─── Write helpers ────────────────────────────────────────────────────────────

export async function writePinParams(
  wallet: WalletClient,
  eid: Hex,
  tOpen: bigint,
  tClose: bigint,
  tRec: number,
  merkleRoot: Hex
): Promise<Hash> {
  return wallet.writeContract({
    ...cfg(),
    functionName: "pinParams",
    args: [eid, tOpen, tClose, tRec, merkleRoot],
    account: wallet.account!,
    chain: foundry,
  });
}

export async function writeAddEligible(
  wallet: WalletClient,
  eid: Hex,
  voters: Address[]
): Promise<Hash> {
  return wallet.writeContract({
    ...cfg(),
    functionName: "addEligible",
    args: [eid, voters],
    account: wallet.account!,
    chain: foundry,
  });
}

export async function writePostFDKGGen(
  wallet: WalletClient,
  eid: Hex,
  Ei: Point,
  guardianSet: Address[],
  shares: EncShare[],
  proof: Hex = "0x"
): Promise<Hash> {
  return wallet.writeContract({
    ...cfg(),
    functionName: "postFDKGGen",
    args: [eid, Ei, guardianSet, shares, proof],
    account: wallet.account!,
    chain: foundry,
  });
}

export async function writeCastBallot(
  wallet: WalletClient,
  eid: Hex,
  c1: Point,
  c2: Point,
  nullifier: Hex,
  proof: Hex = "0x"
): Promise<Hash> {
  return wallet.writeContract({
    ...cfg(),
    functionName: "castBallot",
    args: [eid, c1, c2, nullifier, proof],
    account: wallet.account!,
    chain: foundry,
  });
}

export async function writePostDecShare(
  wallet: WalletClient,
  eid: Hex,
  share: Point,
  proof: Hex = "0x"
): Promise<Hash> {
  return wallet.writeContract({
    ...cfg(),
    functionName: "postDecShare",
    args: [eid, share, proof],
    account: wallet.account!,
    chain: foundry,
  });
}

export async function writePostReconShare(
  wallet: WalletClient,
  eid: Hex,
  tallier: Address,
  shareX: bigint,
  shareY: bigint,
  proof: Hex = "0x"
): Promise<Hash> {
  return wallet.writeContract({
    ...cfg(),
    functionName: "postReconShare",
    args: [eid, tallier, shareX, shareY, proof],
    account: wallet.account!,
    chain: foundry,
  });
}

export async function writeFinalizeTally(
  wallet: WalletClient,
  eid: Hex,
  tallyResult: bigint[]
): Promise<Hash> {
  return wallet.writeContract({
    ...cfg(),
    functionName: "finalizeTally",
    args: [eid, tallyResult],
    account: wallet.account!,
    chain: foundry,
  });
}
