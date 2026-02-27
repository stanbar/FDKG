"use client";

import { useState } from "react";
import {
  createWalletClient,
  createPublicClient,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
import { FDKG_ABI, getContractAddress, readElection } from "@/lib/contract";
import { deriveVoterKeypair, encryptVote, computeNullifier } from "@/lib/crypto";

const RPC = process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545";

function getClients(privKey: Hex) {
  const account = privateKeyToAccount(privKey);
  const transport = http(RPC);
  const wallet = createWalletClient({ chain: foundry, transport, account });
  const pub = createPublicClient({ chain: foundry, transport });
  return { wallet, pub, account };
}

export default function VoterPage() {
  const [privKey, setPrivKey] = useState("");
  const [eid, setEid] = useState("");
  const [choice, setChoice] = useState("1");
  const [numVoters, setNumVoters] = useState("10");
  const [numOptions, setNumOptions] = useState("2");
  const [log, setLog] = useState<string[]>([]);

  const append = (msg: string) => setLog((l) => [...l, msg]);

  const handleCast = async () => {
    if (!privKey.startsWith("0x")) { append("ERROR: need private key"); return; }
    if (!eid.startsWith("0x")) { append("ERROR: need election id"); return; }
    try {
      const { wallet, pub } = getClients(privKey as Hex);
      const pub2 = createPublicClient({ chain: foundry, transport: http(RPC) });
      const addr = getContractAddress();

      // Fetch election public key from contract
      append("Reading election public key…");
      const electionInfo = await readElection(pub2, eid as Hex);
      if (!electionInfo.paramsPinned) {
        append("ERROR: election not pinned");
        return;
      }
      const E = { x: electionInfo.electionPkX, y: electionInfo.electionPkY };
      append(`  E = (${E.x}, ${E.y})`);

      // Derive voter keypair from Ethereum private key (MOCK: same key)
      const voterSk = BigInt(privKey);
      const { privKey: sk } = await deriveVoterKeypair(voterSk);

      // Compute nullifier
      const nf = computeNullifier(sk, eid as Hex);
      append(`  nullifier = ${nf}`);

      // Encrypt vote
      append(`Encrypting vote choice ${choice}…`);
      const { c1, c2 } = await encryptVote(E, Number(choice), Number(numVoters), Number(numOptions));
      append(`  c1 = (${c1.x}, ${c1.y})`);
      append(`  c2 = (${c2.x}, ${c2.y})`);

      // Submit
      const hash = await wallet.writeContract({
        address: addr,
        abi: FDKG_ABI,
        functionName: "castBallot",
        args: [eid as Hex, c1, c2, nf, "0x"],
        account: wallet.account!,
        chain: foundry,
      });
      await pub.waitForTransactionReceipt({ hash });
      append(`✅ castBallot tx: ${hash}`);
    } catch (e: any) {
      append(`ERROR: ${e.message ?? String(e)}`);
    }
  };

  return (
    <div>
      <h1>Voter</h1>
      <p>Cast an encrypted ballot. The contract enforces one-vote-per-nullifier.</p>

      <section>
        <h2>Settings</h2>
        <label>
          Private key (Ethereum / Anvil):{" "}
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
        <br />
        <label>
          Vote choice (1-based):{" "}
          <input type="number" min={1} value={choice} onChange={(e) => setChoice(e.target.value)} />
        </label>
        <br />
        <label>
          Expected max voters (for ballot encoding):{" "}
          <input type="number" value={numVoters} onChange={(e) => setNumVoters(e.target.value)} />
        </label>
        <br />
        <label>
          Number of options:{" "}
          <input type="number" value={numOptions} onChange={(e) => setNumOptions(e.target.value)} />
        </label>
        <br />
        <button onClick={handleCast} style={{ marginTop: "0.5rem" }}>
          Cast Encrypted Ballot
        </button>
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
