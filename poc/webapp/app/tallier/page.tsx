"use client";

import { useState } from "react";
import {
  createWalletClient,
  createPublicClient,
  http,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { FDKG_ABI, getContractAddress, readBallots, readEncShares } from "@/lib/contract";
import {
  generateTallierKeypair,
  fdkgGenerate,
  computeAggregateC,
  computePartialDecryption,
  decryptShareForGuardian,
} from "@/lib/crypto";
import type { EncShare, Point } from "@/lib/types";

const RPC = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";

function getClients(privKey: Hex) {
  const account = privateKeyToAccount(privKey);
  const transport = http(RPC);
  const wallet = createWalletClient({ chain: foundry, transport, account });
  const pub = createPublicClient({ chain: foundry, transport });
  return { wallet, pub, account };
}

export default function TallierPage() {
  const [privKey, setPrivKey] = useState("");
  const [eid, setEid] = useState("");
  const [guardianAddrs, setGuardianAddrs] = useState(
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8\n0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
  );
  const [tRec, setTRec] = useState("2");
  const [guardianPubKeysStr, setGuardianPubKeysStr] = useState("");
  const [log, setLog] = useState<string[]>([]);

  // Stored for dec share posting
  const [savedPrivKey, setSavedPrivKey] = useState<bigint | null>(null);

  // Guardian recon fields
  const [offlineTallier, setOfflineTallier] = useState("");
  const [guardianPrivKey, setGuardianPrivKey] = useState("");
  const [guardianIndex, setGuardianIndex] = useState("1");

  const append = (msg: string) => setLog((l) => [...l, msg]);

  const handlePostFDKGGen = async () => {
    if (!privKey.startsWith("0x")) { append("ERROR: need private key"); return; }
    if (!eid.startsWith("0x")) { append("ERROR: need election id (0x…)"); return; }
    try {
      const { wallet, pub } = getClients(privKey as Hex);
      const addr = getContractAddress();

      append("Generating tallier keypair…");
      const { privKey: sk, pubKey: Ei } = await generateTallierKeypair();
      setSavedPrivKey(sk);
      append(`  Partial public key E_i = (${Ei.x}, ${Ei.y})`);

      const guards = guardianAddrs
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean) as Address[];

      // Guardian public keys: derive from their addresses via deterministic mock
      // In a real system these come from a PKI / on-chain registry.
      // For the PoC we use placeholder BabyJub points.
      let gPubKeys: [Uint8Array, Uint8Array][];
      if (guardianPubKeysStr.trim()) {
        const lines = guardianPubKeysStr.trim().split("\n");
        const sc = await import("shared-crypto");
        gPubKeys = lines.map((line) => {
          const [x, y] = line.split(",").map((s) => BigInt(s.trim()));
          return [sc.F.e(x), sc.F.e(y)] as [Uint8Array, Uint8Array];
        });
      } else {
        // Fallback: use Base8 as placeholder for all guardians (PoC only)
        const sc = await import("shared-crypto");
        const BASE8_X = 5299619240641551281634865583518297030282874472190772894086521144482721001553n;
        const BASE8_Y = 16950150798460657717958625567821834550301663161624707787222815936182638968203n;
        gPubKeys = guards.map(() => [sc.F.e(BASE8_X), sc.F.e(BASE8_Y)] as [Uint8Array, Uint8Array]);
        append("  WARN: using placeholder guardian public keys (Base8). Set real keys for production.");
      }

      append("Generating FDKG message (Shamir split + ElGamal encrypt)…");
      const result = await fdkgGenerate(sk, Ei, guards, gPubKeys, Number(tRec));

      append(`  ${guards.length} encrypted shares generated.`);

      const hash = await wallet.writeContract({
        address: addr,
        abi: FDKG_ABI,
        functionName: "postFDKGGen",
        args: [eid as Hex, result.Ei, guards, result.encShares, result.proof],
        account: wallet.account!,
        chain: foundry,
      });
      await pub.waitForTransactionReceipt({ hash });
      append(`✅ postFDKGGen tx: ${hash}`);
      append(`   Save your partial secret key: ${sk.toString(16)}`);
    } catch (e: any) {
      append(`ERROR: ${e.message}`);
    }
  };

  const handlePostDecShare = async () => {
    if (!privKey.startsWith("0x")) { append("ERROR: need private key"); return; }
    if (!eid.startsWith("0x")) { append("ERROR: need election id"); return; }
    if (!savedPrivKey) { append("ERROR: run postFDKGGen first (to have partial secret key)"); return; }
    try {
      const { wallet, pub, account } = getClients(privKey as Hex);
      const pub2 = createPublicClient({ chain: foundry, transport: http(RPC) });
      const addr = getContractAddress();

      append("Reading ballots…");
      const ballots = await readBallots(pub2, eid as Hex);
      if (ballots.length === 0) { append("ERROR: no ballots yet"); return; }

      append(`  ${ballots.length} ballots found. Computing aggregate C1…`);
      const { aggC1 } = await computeAggregateC(ballots);

      append("Computing partial decryption PD_i = sk_i · aggC1…");
      const pd = await computePartialDecryption(savedPrivKey, aggC1);
      append(`  PD_i = (${pd.x}, ${pd.y})`);

      const hash = await wallet.writeContract({
        address: addr,
        abi: FDKG_ABI,
        functionName: "postDecShare",
        args: [eid as Hex, pd, "0x"],
        account: wallet.account!,
        chain: foundry,
      });
      await pub.waitForTransactionReceipt({ hash });
      append(`✅ postDecShare tx: ${hash}`);
    } catch (e: any) {
      append(`ERROR: ${e.message}`);
    }
  };

  const handlePostReconShare = async () => {
    if (!guardianPrivKey.startsWith("0x")) { append("ERROR: need guardian private key"); return; }
    if (!eid.startsWith("0x")) { append("ERROR: need election id"); return; }
    if (!offlineTallier.startsWith("0x")) { append("ERROR: need offline tallier address"); return; }
    try {
      const { wallet, pub, account } = getClients(guardianPrivKey as Hex);
      const pub2 = createPublicClient({ chain: foundry, transport: http(RPC) });
      const addr = getContractAddress();

      append(`Reading encrypted shares for tallier ${offlineTallier}…`);
      const shares = await readEncShares(pub2, eid as Hex, offlineTallier as Address);
      const gIdx = Number(guardianIndex) - 1; // 0-based array index
      if (gIdx < 0 || gIdx >= shares.length) {
        append(`ERROR: guardian index ${guardianIndex} out of range (${shares.length} shares)`);
        return;
      }

      const sc = await import("shared-crypto");
      const guardianSk = sc.formatPrivKeyForBabyJub(BigInt(guardianPrivKey));

      append(`Decrypting share at index ${guardianIndex}…`);
      const { shareX, shareY } = await decryptShareForGuardian(guardianSk, shares[gIdx], Number(guardianIndex));
      append(`  Plaintext share: x=${shareX}, y=${shareY.toString()}`);

      const hash = await wallet.writeContract({
        address: addr,
        abi: FDKG_ABI,
        functionName: "postReconShare",
        args: [eid as Hex, offlineTallier as Address, BigInt(shareX), shareY, "0x"],
        account: wallet.account!,
        chain: foundry,
      });
      await pub.waitForTransactionReceipt({ hash });
      append(`✅ postReconShare tx: ${hash}`);
    } catch (e: any) {
      append(`ERROR: ${e.message}`);
    }
  };

  return (
    <div>
      <h1>Tallier</h1>
      <p>Register your FDKG key contribution, post decryption shares, or act as guardian.</p>

      <section>
        <h2>Common settings</h2>
        <label>
          Private key:{" "}
          <input
            type="password"
            placeholder="0x…"
            value={privKey}
            onChange={(e) => setPrivKey(e.target.value)}
            style={{ width: "60%", fontFamily: "monospace" }}
          />
        </label>
        <br />
        <label>
          Election ID:{" "}
          <input
            placeholder="0x… (from organiser page)"
            value={eid}
            onChange={(e) => setEid(e.target.value)}
            style={{ width: "70%", fontFamily: "monospace" }}
          />
        </label>
      </section>

      <section>
        <h2>A. FDKG Generation (before tOpen)</h2>
        <label>
          Guardian addresses (one per line):
          <textarea
            rows={3}
            value={guardianAddrs}
            onChange={(e) => setGuardianAddrs(e.target.value)}
            style={{ width: "100%", fontFamily: "monospace" }}
          />
        </label>
        <label>
          Guardian BabyJub public keys (one per line, "x,y" — leave blank to use placeholder):
          <textarea
            rows={3}
            value={guardianPubKeysStr}
            onChange={(e) => setGuardianPubKeysStr(e.target.value)}
            style={{ width: "100%", fontFamily: "monospace" }}
          />
        </label>
        <label>
          tRec (threshold):{" "}
          <input type="number" value={tRec} onChange={(e) => setTRec(e.target.value)} />
        </label>
        <br />
        <button onClick={handlePostFDKGGen}>Post FDKG Generation Message</button>
      </section>

      <section>
        <h2>B. Post Decryption Share (after tClose)</h2>
        <p>Requires you ran step A in this session (partial secret key is held in memory).</p>
        <button onClick={handlePostDecShare}>Compute &amp; Post Dec Share</button>
      </section>

      <section>
        <h2>C. Guardian: Post Reconstruction Share (for offline tallier)</h2>
        <label>
          Guardian private key:{" "}
          <input
            type="password"
            placeholder="0x…"
            value={guardianPrivKey}
            onChange={(e) => setGuardianPrivKey(e.target.value)}
            style={{ width: "60%", fontFamily: "monospace" }}
          />
        </label>
        <br />
        <label>
          Offline tallier address:{" "}
          <input
            placeholder="0x…"
            value={offlineTallier}
            onChange={(e) => setOfflineTallier(e.target.value)}
            style={{ width: "60%", fontFamily: "monospace" }}
          />
        </label>
        <br />
        <label>
          Your guardian position (1-based):{" "}
          <input
            type="number"
            value={guardianIndex}
            onChange={(e) => setGuardianIndex(e.target.value)}
          />
        </label>
        <br />
        <button onClick={handlePostReconShare}>Decrypt &amp; Post Recon Share</button>
      </section>

      <section>
        <h2>Log</h2>
        <pre style={{ background: "#f4f4f4", padding: "1rem", overflowX: "auto" }}>
          {log.join("\n") || "(no output yet)"}
        </pre>
      </section>
    </div>
  );
}
