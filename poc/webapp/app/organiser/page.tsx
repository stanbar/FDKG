"use client";

import { useState } from "react";
import {
  createWalletClient,
  createPublicClient,
  http,
  type Address,
  type Hex,
  keccak256,
  toHex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { FDKG_ABI, getContractAddress } from "@/lib/contract";

const RPC = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";

function getClients(privKey: Hex) {
  const account = privateKeyToAccount(privKey);
  const transport = http(RPC);
  const wallet = createWalletClient({ chain: foundry, transport, account });
  const pub = createPublicClient({ chain: foundry, transport });
  return { wallet, pub, account };
}

export default function OrganiserPage() {
  const [privKey, setPrivKey] = useState("");
  const [electionName, setElectionName] = useState("demo-election-001");
  const [tOpenOffset, setTOpenOffset] = useState("60");   // seconds from now
  const [tCloseOffset, setTCloseOffset] = useState("300");
  const [tRec, setTRec] = useState("2");
  const [voterList, setVoterList] = useState(
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8\n0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
  );
  const [log, setLog] = useState<string[]>([]);
  const [eid, setEid] = useState<Hex | null>(null);

  const append = (msg: string) => setLog((l) => [...l, msg]);

  const handlePin = async () => {
    if (!privKey.startsWith("0x")) {
      append("ERROR: private key must start with 0x");
      return;
    }
    try {
      const { wallet, pub } = getClients(privKey as Hex);
      const addr = getContractAddress();

      const now = BigInt(Math.floor(Date.now() / 1000));
      const tOpen = now + BigInt(tOpenOffset);
      const tClose = now + BigInt(tCloseOffset);

      const electionId = keccak256(toHex(electionName)) as Hex;
      setEid(electionId);

      append(`Pinning election "${electionName}" (eid=${electionId})…`);
      const hash = await wallet.writeContract({
        address: addr,
        abi: FDKG_ABI,
        functionName: "pinParams",
        args: [electionId, tOpen, tClose, Number(tRec), "0x0000000000000000000000000000000000000000000000000000000000000000" as Hex],
        account: wallet.account!,
        chain: foundry,
      });
      await pub.waitForTransactionReceipt({ hash });
      append(`✅ pinParams tx: ${hash}`);
      append(`   tOpen  = ${new Date(Number(tOpen) * 1000).toISOString()}`);
      append(`   tClose = ${new Date(Number(tClose) * 1000).toISOString()}`);
    } catch (e: any) {
      append(`ERROR: ${e.message}`);
    }
  };

  const handleAddEligible = async () => {
    if (!privKey.startsWith("0x")) { append("ERROR: need private key"); return; }
    if (!eid) { append("ERROR: pin params first"); return; }
    try {
      const { wallet, pub } = getClients(privKey as Hex);
      const addr = getContractAddress();
      const voters = voterList
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean) as Address[];
      append(`Adding ${voters.length} eligible voter(s)…`);
      const hash = await wallet.writeContract({
        address: addr,
        abi: FDKG_ABI,
        functionName: "addEligible",
        args: [eid, voters],
        account: wallet.account!,
        chain: foundry,
      });
      await pub.waitForTransactionReceipt({ hash });
      append(`✅ addEligible tx: ${hash}`);
    } catch (e: any) {
      append(`ERROR: ${e.message}`);
    }
  };

  return (
    <div>
      <h1>Organiser</h1>
      <p>Pin election parameters and configure eligible voters.</p>

      <section>
        <h2>1. Private key (Anvil test key)</h2>
        <input
          type="password"
          placeholder="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
          value={privKey}
          onChange={(e) => setPrivKey(e.target.value)}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
        <p style={{ fontSize: "0.8rem", color: "#888" }}>
          Anvil default key #0: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
        </p>
      </section>

      <section>
        <h2>2. Election parameters</h2>
        <label>
          Election name (used to derive eid):{" "}
          <input value={electionName} onChange={(e) => setElectionName(e.target.value)} />
        </label>
        <br />
        <label>
          Keygen window ends (seconds from now):{" "}
          <input type="number" value={tOpenOffset} onChange={(e) => setTOpenOffset(e.target.value)} />
        </label>
        <br />
        <label>
          Voting window ends (seconds from now):{" "}
          <input type="number" value={tCloseOffset} onChange={(e) => setTCloseOffset(e.target.value)} />
        </label>
        <br />
        <label>
          Guardian threshold tRec:{" "}
          <input type="number" value={tRec} onChange={(e) => setTRec(e.target.value)} />
        </label>
        <br />
        <button onClick={handlePin} style={{ marginTop: "0.5rem" }}>
          Pin Params
        </button>
        {eid && <p>Election ID: <code>{eid}</code></p>}
      </section>

      <section>
        <h2>3. Eligible voters (one address per line)</h2>
        <textarea
          rows={5}
          value={voterList}
          onChange={(e) => setVoterList(e.target.value)}
          style={{ width: "100%", fontFamily: "monospace" }}
        />
        <br />
        <input
          placeholder="Election ID (0x…)"
          value={eid ?? ""}
          onChange={(e) => setEid(e.target.value as Hex)}
          style={{ width: "100%", fontFamily: "monospace", marginBottom: "0.5rem" }}
        />
        <button onClick={handleAddEligible}>Add Eligible Voters</button>
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
