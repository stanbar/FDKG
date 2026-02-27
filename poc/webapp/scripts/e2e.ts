#!/usr/bin/env tsx
/**
 * e2e.ts — End-to-end election test script.
 *
 * Runs against a local Anvil node and exercises the full FDKG-Vote-BC protocol:
 *   1. Deploy FDKGVoteGW
 *   2. Pin election params
 *   3. Add eligible voters
 *   4. Two talliers post FDKG generation messages (real BabyJub keys + Shamir shares)
 *   5. Advance time to voting window (anvil_increaseTime)
 *   6. Three voters cast real encrypted ballots
 *   7. Attempt duplicate nullifier cast → expect revert
 *   8. Advance time to decryption window
 *   9. Tallier 1 posts partial decryption share
 *  10. Tallier 2 is "offline" → guardian 1 and guardian 2 post recon shares
 *  11. Off-chain: reconstruct tallier 2 secret; combine with tallier 1 PD; compute tally
 *  12. finalizeTally → verify on-chain
 *  13. Assert tally matches expected counts
 *
 * Usage:
 *   # Start Anvil first:
 *   anvil &
 *
 *   # Set contract address (deploy with forge script or use DEPLOY=true):
 *   DEPLOY=true npx tsx scripts/e2e.ts
 *
 *   # Or pass address directly:
 *   CONTRACT_ADDRESS=0x… npx tsx scripts/e2e.ts
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  keccak256,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import assert from "assert";

// ─── Bootstrap shared-crypto (async WASM init) ────────────────────────────────
const sc = await import("shared-crypto");

// ─── Viem clients ─────────────────────────────────────────────────────────────

const RPC = process.env.RPC_URL ?? "http://127.0.0.1:8545";
const transport = http(RPC);

// Anvil's default funded test keys (accounts 0-7)
const KEYS: Hex[] = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
  "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
  "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
  "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
];

const accounts = KEYS.map((k) => privateKeyToAccount(k));
const [orgKey, t1Key, t2Key, g1Key, g2Key, v1Key, v2Key, v3Key] = KEYS;
const [org, tallier1, tallier2, guardian1, guardian2, voter1, voter2, voter3] =
  accounts.map((a) => a.address as Address);

function walletOf(key: Hex) {
  return createWalletClient({
    chain: foundry,
    transport,
    account: privateKeyToAccount(key),
  });
}

const pubClient = createPublicClient({ chain: foundry, transport });

// ─── Deploy helper ─────────────────────────────────────────────────────────────

async function deployContract(): Promise<Address> {
  // Read compiled bytecode from forge output
  const { readFileSync } = await import("fs");
  const { join, dirname } = await import("path");
  const { fileURLToPath } = await import("url");
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const artefactPath = join(
    __dirname, "..", "..", "out", "FDKGVoteGW.sol", "FDKGVoteGW.json"
  );
  const artefact = JSON.parse(readFileSync(artefactPath, "utf8"));
  const bytecode = artefact.bytecode.object as Hex;

  const w = walletOf(orgKey);
  const hash = await w.deployContract({
    abi: [],
    bytecode,
    account: accounts[0],
    chain: foundry,
  });
  const receipt = await pubClient.waitForTransactionReceipt({ hash });
  console.log(`  Deployed at: ${receipt.contractAddress}`);
  return receipt.contractAddress!;
}

// ─── FDKG_ABI (minimal subset needed) ────────────────────────────────────────

import { FDKG_ABI } from "../lib/contract.ts";

// ─── Crypto helpers ───────────────────────────────────────────────────────────

import {
  generateTallierKeypair,
  fdkgGenerate,
  encryptVote,
  computeNullifier,
  computeAggregateC,
  computePartialDecryption,
  decryptShareForGuardian,
  computeTally,
} from "../lib/crypto.ts";
import type { DecryptionMaterial } from "../lib/types.ts";

// ─── Anvil time helpers ────────────────────────────────────────────────────────

async function increaseTime(seconds: number) {
  await pubClient.request({
    method: "evm_increaseTime" as any,
    params: [toHex(seconds)] as any,
  });
  await pubClient.request({ method: "evm_mine" as any, params: [] as any });
}

// ─── Contract call helpers ────────────────────────────────────────────────────

function cfg(addr: Address) {
  return { address: addr, abi: FDKG_ABI };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n=== FDKG-Vote-BC End-to-End Test ===\n");

  // ── Deploy ────────────────────────────────────────────────────────────────
  let CONTRACT: Address;
  const envAddr = process.env.CONTRACT_ADDRESS;
  if (envAddr) {
    CONTRACT = envAddr as Address;
    console.log(`Using existing contract: ${CONTRACT}`);
  } else {
    console.log("Deploying FDKGVoteGW…");
    CONTRACT = await deployContract();
  }
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS = CONTRACT;

  // ── 1. Pin params ─────────────────────────────────────────────────────────
  const EID = keccak256(toHex("e2e-election-001")) as Hex;
  // Use on-chain block timestamp (may differ from wall clock due to prior evm_increaseTime calls)
  const latestBlock = await pubClient.getBlock({ blockTag: "latest" });
  const chainNow = Number(latestBlock.timestamp);
  const tOpen  = BigInt(chainNow + 30);   // keygen window: 30 s
  const tClose = BigInt(chainNow + 90);   // voting window: 60 s
  const T_REC  = 2;

  console.log("1. Pinning election params…");
  {
    const w = walletOf(orgKey);
    const hash = await w.writeContract({
      ...cfg(CONTRACT),
      functionName: "pinParams",
      args: [EID, tOpen, tClose, T_REC, "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex],
      account: accounts[0],
      chain: foundry,
    });
    await pubClient.waitForTransactionReceipt({ hash });
    console.log(`   tx: ${hash}`);
  }

  // ── 2. Add eligible voters ────────────────────────────────────────────────
  console.log("2. Adding eligible voters…");
  {
    const w = walletOf(orgKey);
    const hash = await w.writeContract({
      ...cfg(CONTRACT),
      functionName: "addEligible",
      args: [EID, [voter1, voter2, voter3]],
      account: accounts[0],
      chain: foundry,
    });
    await pubClient.waitForTransactionReceipt({ hash });
    console.log(`   voters: ${voter1}, ${voter2}, ${voter3}`);
  }

  // ── 3. FDKG Generation ─────────────────────────────────────────────────────
  console.log("3. FDKG generation (tallier1, tallier2)…");

  const t1 = await generateTallierKeypair();
  const t2 = await generateTallierKeypair();

  console.log(`   tallier1 E1 = (${t1.pubKey.x}, ${t1.pubKey.y})`);
  console.log(`   tallier2 E2 = (${t2.pubKey.x}, ${t2.pubKey.y})`);

  // Guardian public keys derived from their Ethereum private keys
  const g1Sk = sc.formatPrivKeyForBabyJub(BigInt(g1Key));
  const g2Sk = sc.formatPrivKeyForBabyJub(BigInt(g2Key));
  const g1PkBjj = sc.genPubKey(g1Sk);
  const g2PkBjj = sc.genPubKey(g2Sk);
  const guardianPubKeys: [Uint8Array, Uint8Array][] = [g1PkBjj, g2PkBjj];

  const gen1 = await fdkgGenerate(
    t1.privKey, t1.pubKey,
    [guardian1, guardian2],
    guardianPubKeys,
    T_REC
  );
  const gen2 = await fdkgGenerate(
    t2.privKey, t2.pubKey,
    [guardian1, guardian2],
    guardianPubKeys,
    T_REC
  );

  {
    const w1 = walletOf(t1Key);
    const hash = await w1.writeContract({
      ...cfg(CONTRACT),
      functionName: "postFDKGGen",
      args: [EID, gen1.Ei, gen1.guardians, gen1.encShares, gen1.proof],
      account: accounts[1],
      chain: foundry,
    });
    await pubClient.waitForTransactionReceipt({ hash });
    console.log(`   tallier1 gen tx: ${hash}`);
  }
  {
    const w2 = walletOf(t2Key);
    const hash = await w2.writeContract({
      ...cfg(CONTRACT),
      functionName: "postFDKGGen",
      args: [EID, gen2.Ei, gen2.guardians, gen2.encShares, gen2.proof],
      account: accounts[2],
      chain: foundry,
    });
    await pubClient.waitForTransactionReceipt({ hash });
    console.log(`   tallier2 gen tx: ${hash}`);
  }

  // Read aggregated election public key from contract
  const electionInfo = await pubClient.readContract({
    ...cfg(CONTRACT),
    functionName: "getElectionInfo",
    args: [EID],
  }) as any;
  const E = { x: electionInfo[7], y: electionInfo[8] };
  console.log(`   E (on-chain aggregate) = (${E.x}, ${E.y})`);

  // ── 4. Advance to voting window ───────────────────────────────────────────
  console.log("4. Advancing time to voting window…");
  await increaseTime(35); // past tOpen

  // ── 5. Cast ballots ────────────────────────────────────────────────────────
  console.log("5. Casting 3 ballots…");
  const NUM_VOTERS = 5;
  const NUM_OPTIONS = 2;

  // Voters: voter1→choice 1, voter2→choice 2, voter3→choice 1  (expected: [2,1])
  const votes = [
    { key: v1Key, account: accounts[5], choice: 1 },
    { key: v2Key, account: accounts[6], choice: 2 },
    { key: v3Key, account: accounts[7], choice: 1 },
  ];
  const expectedTally = [2n, 1n];

  for (const v of votes) {
    const sk = sc.formatPrivKeyForBabyJub(BigInt(v.key));
    const nf = computeNullifier(sk, EID);
    const { c1, c2 } = await encryptVote(E, v.choice, NUM_VOTERS, NUM_OPTIONS);

    const w = walletOf(v.key);
    const hash = await w.writeContract({
      ...cfg(CONTRACT),
      functionName: "castBallot",
      args: [EID, c1, c2, nf, "0x"],
      account: v.account,
      chain: foundry,
    });
    await pubClient.waitForTransactionReceipt({ hash });
    console.log(`   voter cast choice=${v.choice} nf=${nf.slice(0,10)}… tx: ${hash.slice(0,12)}…`);
  }

  // ── 6. Test duplicate nullifier rejection ──────────────────────────────────
  console.log("6. Testing duplicate nullifier rejection…");
  {
    const sk = sc.formatPrivKeyForBabyJub(BigInt(v1Key));
    const nf = computeNullifier(sk, EID); // same as voter1's nullifier
    const { c1, c2 } = await encryptVote(E, 1, NUM_VOTERS, NUM_OPTIONS);
    const w = walletOf(v1Key);
    try {
      const hash = await w.writeContract({
        ...cfg(CONTRACT),
        functionName: "castBallot",
        args: [EID, c1, c2, nf, "0x"],
        account: accounts[5],
        chain: foundry,
      });
      await pubClient.waitForTransactionReceipt({ hash });
      throw new Error("Expected revert but tx succeeded");
    } catch (e: any) {
      if (e.message?.includes("nullifier already used")) {
        console.log(`   ✅ Duplicate nullifier correctly rejected.`);
      } else if (e.message?.includes("Expected revert")) {
        throw e;
      } else {
        console.log(`   ✅ Reverted: ${e.message?.slice(0, 80)}`);
      }
    }
  }

  // ── 7. Advance to decryption window ───────────────────────────────────────
  console.log("7. Advancing time to decryption window…");
  await increaseTime(70); // past tClose

  // ── 8. Tallier 1 posts dec share ──────────────────────────────────────────
  console.log("8. Tallier 1 posting dec share…");
  {
    const ballots = await pubClient.readContract({
      ...cfg(CONTRACT),
      functionName: "getBallots",
      args: [EID],
    }) as any[];
    const { aggC1 } = await computeAggregateC(
      ballots.map((b: any) => ({
        c1: { x: b.c1.x, y: b.c1.y },
        c2: { x: b.c2.x, y: b.c2.y },
      }))
    );
    const pd1 = await computePartialDecryption(t1.privKey, aggC1);
    console.log(`   PD1 = (${pd1.x}, ${pd1.y})`);

    const w = walletOf(t1Key);
    const hash = await w.writeContract({
      ...cfg(CONTRACT),
      functionName: "postDecShare",
      args: [EID, pd1, "0x"],
      account: accounts[1],
      chain: foundry,
    });
    await pubClient.waitForTransactionReceipt({ hash });
    console.log(`   postDecShare tx: ${hash}`);
  }

  // ── 9. Tallier 2 offline → guardians post recon shares ────────────────────
  console.log("9. Tallier 2 offline — guardians posting recon shares…");
  {
    const rawShares = await pubClient.readContract({
      ...cfg(CONTRACT),
      functionName: "getEncShares",
      args: [EID, tallier2],
    }) as any[];

    console.log(`   ${rawShares.length} encrypted shares found for tallier2`);

    // Guardian 1 decrypts share at index 0 (shareX=1)
    const enc1 = {
      c1: { x: rawShares[0].c1.x, y: rawShares[0].c1.y },
      c2: { x: rawShares[0].c2.x, y: rawShares[0].c2.y },
      xIncrement: rawShares[0].xIncrement,
    };
    const { shareX: sx1, shareY: sy1 } = await decryptShareForGuardian(g1Sk, enc1, 1);
    console.log(`   guardian1 share: x=${sx1}, y=${sy1}`);

    const wg1 = walletOf(g1Key);
    const h1 = await wg1.writeContract({
      ...cfg(CONTRACT),
      functionName: "postReconShare",
      args: [EID, tallier2, BigInt(sx1), sy1, "0x"],
      account: accounts[3],
      chain: foundry,
    });
    await pubClient.waitForTransactionReceipt({ hash: h1 });
    console.log(`   guardian1 postReconShare tx: ${h1}`);

    // Guardian 2 decrypts share at index 1 (shareX=2)
    const enc2 = {
      c1: { x: rawShares[1].c1.x, y: rawShares[1].c1.y },
      c2: { x: rawShares[1].c2.x, y: rawShares[1].c2.y },
      xIncrement: rawShares[1].xIncrement,
    };
    const { shareX: sx2, shareY: sy2 } = await decryptShareForGuardian(g2Sk, enc2, 2);
    console.log(`   guardian2 share: x=${sx2}, y=${sy2}`);

    const wg2 = walletOf(g2Key);
    const h2 = await wg2.writeContract({
      ...cfg(CONTRACT),
      functionName: "postReconShare",
      args: [EID, tallier2, BigInt(sx2), sy2, "0x"],
      account: accounts[4],
      chain: foundry,
    });
    await pubClient.waitForTransactionReceipt({ hash: h2 });
    console.log(`   guardian2 postReconShare tx: ${h2}`);
  }

  // ── 10. Check enough dec material ─────────────────────────────────────────
  const enough = await pubClient.readContract({
    ...cfg(CONTRACT),
    functionName: "enoughDecMaterial",
    args: [EID],
  });
  console.log(`\n10. Enough dec material: ${enough}`);
  assert.ok(enough, "Should have enough dec material");

  // ── 11. Compute tally off-chain ────────────────────────────────────────────
  console.log("11. Computing tally off-chain…");
  {
    const ballots = (await pubClient.readContract({
      ...cfg(CONTRACT),
      functionName: "getBallots",
      args: [EID],
    }) as any[]).map((b: any) => ({
      c1: { x: b.c1.x, y: b.c1.y },
      c2: { x: b.c2.x, y: b.c2.y },
    }));

    const decSharesRaw = (await pubClient.readContract({
      ...cfg(CONTRACT),
      functionName: "getDecShares",
      args: [EID],
    }) as any[]);

    const reconSharesRaw = (await pubClient.readContract({
      ...cfg(CONTRACT),
      functionName: "getReconShares",
      args: [EID],
    }) as any[]);

    const decMat: DecryptionMaterial = {
      directShares: new Map(),
      reconShares: new Map(),
      partialSecrets: new Map(),
    };
    for (const ds of decSharesRaw) {
      decMat.directShares.set((ds.tallier as string).toLowerCase(), {
        x: ds.share.x,
        y: ds.share.y,
      });
    }
    for (const rs of reconSharesRaw) {
      const key = (rs.tallier as string).toLowerCase();
      if (!decMat.reconShares.has(key)) decMat.reconShares.set(key, []);
      decMat.reconShares.get(key)!.push({
        tallier: rs.tallier,
        guardian: rs.guardian,
        shareX: rs.shareX,
        shareY: rs.shareY,
      });
    }

    const tallyResult = await computeTally(decMat, ballots, NUM_VOTERS, NUM_OPTIONS);
    console.log(`   Computed tally: [${tallyResult.join(", ")}]`);
    console.log(`   Expected tally: [${expectedTally.join(", ")}]`);

    // ── 12. Finalize on-chain ──────────────────────────────────────────────
    console.log("12. Finalizing tally on-chain…");
    const w = walletOf(orgKey);
    const hash = await w.writeContract({
      ...cfg(CONTRACT),
      functionName: "finalizeTally",
      args: [EID, tallyResult],
      account: accounts[0],
      chain: foundry,
    });
    await pubClient.waitForTransactionReceipt({ hash });
    console.log(`    finalizeTally tx: ${hash}`);

    // ── 13. Verify ────────────────────────────────────────────────────────
    const stored = await pubClient.readContract({
      ...cfg(CONTRACT),
      functionName: "getTallyResult",
      args: [EID],
    }) as bigint[];

    console.log(`    On-chain tally: [${stored.join(", ")}]`);

    assert.deepStrictEqual(
      tallyResult.map(String),
      expectedTally.map(String),
      `Tally mismatch: got [${tallyResult}] expected [${expectedTally}]`
    );
    console.log("\n✅ All assertions passed. End-to-end election flow complete.\n");
  }
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
