"use client";

import { useState } from "react";
import {
  createWalletClient,
  createPublicClient,
  http,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
  FDKG_ABI,
  getContractAddress,
  readElection,
  readBallots,
  readDecShares,
  readReconShares,
  readTallierList,
  readTally,
  readEnoughDecMaterial,
} from "@/lib/contract";
import {
  computeAggregateC,
  computeTally,
} from "@/lib/crypto";
import type { DecryptionMaterial, ReconShare } from "@/lib/types";

const RPC = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";

function getClients(privKey: Hex) {
  const account = privateKeyToAccount(privKey);
  const transport = http(RPC);
  const wallet = createWalletClient({ chain: baseSepolia, transport, account });
  const pub = createPublicClient({ chain: baseSepolia, transport });
  return { wallet, pub, account };
}

export default function ResultsPage() {
  const [eid, setEid] = useState("");
  const [privKey, setPrivKey] = useState("");
  const [numVoters, setNumVoters] = useState("10");
  const [numOptions, setNumOptions] = useState("2");
  const [log, setLog] = useState<string[]>([]);
  const [info, setInfo] = useState<any>(null);
  const [tally, setTally] = useState<bigint[] | null>(null);

  const append = (msg: string) => setLog((l) => [...l, msg]);
  const pub2 = () => createPublicClient({ chain: baseSepolia, transport: http(RPC) });

  const handleRefresh = async () => {
    if (!eid.startsWith("0x")) { append("ERROR: need election id"); return; }
    try {
      const client = pub2();
      const electionInfo = await readElection(client, eid as Hex);
      setInfo(electionInfo);
      append(`Election pinned: ${electionInfo.paramsPinned}`);
      append(`Tallier count: ${electionInfo.tallierCount}`);
      append(`Ballot count: ${electionInfo.ballotCount}`);
      append(`Dec share count: ${electionInfo.decShareCount}`);
      append(`Tally finalized: ${electionInfo.tallyFinalized}`);
      const enough = await readEnoughDecMaterial(client, eid as Hex);
      append(`Enough dec material: ${enough}`);

      if (electionInfo.tallyFinalized) {
        const stored = await readTally(client, eid as Hex);
        setTally(stored);
        append(`On-chain tally: [${stored.join(", ")}]`);
      }
    } catch (e: any) {
      append(`ERROR: ${e.message}`);
    }
  };

  const handleComputeAndFinalize = async () => {
    if (!eid.startsWith("0x")) { append("ERROR: need election id"); return; }
    if (!privKey.startsWith("0x")) { append("ERROR: need private key to send tx"); return; }
    try {
      const client = pub2();
      const { wallet, pub } = getClients(privKey as Hex);
      const addr = getContractAddress();

      append("Loading on-chain data…");
      const ballots = await readBallots(client, eid as Hex);
      const decShares = await readDecShares(client, eid as Hex);
      const reconShares = await readReconShares(client, eid as Hex);

      append(`  ${ballots.length} ballots, ${decShares.length} dec shares, ${reconShares.length} recon shares`);

      if (ballots.length === 0) { append("ERROR: no ballots"); return; }

      // Build decryption material map
      const decMat: DecryptionMaterial = {
        directShares: new Map(),
        reconShares: new Map(),
        partialSecrets: new Map(),
      };
      for (const ds of decShares) {
        decMat.directShares.set(ds.tallier.toLowerCase(), ds.share);
      }
      for (const rs of reconShares) {
        const key = rs.tallier.toLowerCase();
        if (!decMat.reconShares.has(key)) decMat.reconShares.set(key, []);
        decMat.reconShares.get(key)!.push(rs);
      }

      append("Computing off-chain tally…");
      const result = await computeTally(
        decMat,
        ballots,
        Number(numVoters),
        Number(numOptions)
      );
      setTally(result);
      append(`  Off-chain tally: [${result.join(", ")}]`);

      const enough = await readEnoughDecMaterial(client, eid as Hex);
      if (!enough) {
        append("WARNING: contract says not enough dec material — finalizeTally will revert.");
        append("  Proceeding anyway (contract check may have different view).");
      }

      append("Submitting finalizeTally…");
      const hash = await wallet.writeContract({
        address: addr,
        abi: FDKG_ABI,
        functionName: "finalizeTally",
        args: [eid as Hex, result],
        account: wallet.account!,
        chain: baseSepolia,
      });
      await pub.waitForTransactionReceipt({ hash });
      append(`✅ finalizeTally tx: ${hash}`);
    } catch (e: any) {
      append(`ERROR: ${e.message ?? String(e)}`);
    }
  };

  return (
    <div>
      <h1>Results</h1>
      <p>View election status, compute the tally off-chain, and finalize on-chain.</p>

      <section>
        <h2>Settings</h2>
        <label>
          Election ID:{" "}
          <input
            placeholder="0x…"
            value={eid}
            onChange={(e) => setEid(e.target.value)}
            style={{ width: "70%", fontFamily: "monospace" }}
          />
        </label>
        <br />
        <label>
          Max voters (ballot encoding):{" "}
          <input type="number" value={numVoters} onChange={(e) => setNumVoters(e.target.value)} />
        </label>
        <br />
        <label>
          Number of options:{" "}
          <input type="number" value={numOptions} onChange={(e) => setNumOptions(e.target.value)} />
        </label>
        <br />
        <label>
          Private key (to send finalizeTally tx):{" "}
          <input
            type="password"
            placeholder="0x…"
            value={privKey}
            onChange={(e) => setPrivKey(e.target.value)}
            style={{ width: "60%", fontFamily: "monospace" }}
          />
        </label>
        <br />
        <button onClick={handleRefresh} style={{ marginRight: "1rem" }}>
          Refresh Status
        </button>
        <button onClick={handleComputeAndFinalize}>
          Compute Tally &amp; Finalize On-Chain
        </button>
      </section>

      {tally && (
        <section>
          <h2>Tally</h2>
          <table style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>Option</th>
                <th style={{ border: "1px solid #ccc", padding: "0.5rem" }}>Votes</th>
              </tr>
            </thead>
            <tbody>
              {tally.map((count, i) => (
                <tr key={i}>
                  <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{i + 1}</td>
                  <td style={{ border: "1px solid #ccc", padding: "0.5rem" }}>{count.toString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section>
        <h2>Log</h2>
        <pre style={{ background: "#f4f4f4", padding: "1rem", overflowX: "auto" }}>
          {log.join("\n") || "(no output yet)"}
        </pre>
      </section>
    </div>
  );
}
