"use client";

export default function HomePage() {
  return (
    <div>
      <h1>FDKG-Vote-BC — Proof of Concept</h1>
      <p>
        This demo implements the <strong>FDKG-Vote-BC</strong> protocol:
        a fully on-chain, threshold-encrypted election using Federated DKG.
      </p>

      <h2>Protocol Phases</h2>
      <ol>
        <li>
          <strong>Deploy &amp; Pin Params</strong> — the <em>Organiser</em> anchors
          the election (eid, time windows, eligible set) on-chain.
        </li>
        <li>
          <strong>FDKG Generation</strong> — <em>Talliers</em> post partial public
          keys + encrypted Shamir shares before voting opens.
          The contract aggregates them into the election public key E.
        </li>
        <li>
          <strong>Casting</strong> — <em>Voters</em> encrypt their choice under E
          and submit with a one-time nullifier. Duplicate nullifiers are rejected.
        </li>
        <li>
          <strong>Decryption</strong> — after voting closes, talliers post partial
          decryptions; guardians cover offline talliers via SSS reconstruction.
        </li>
        <li>
          <strong>Tally</strong> — anyone computes the tally off-chain and submits
          it once sufficient decryption material is posted.
        </li>
      </ol>

      <h2>Mocked pieces (PoC)</h2>
      <ul>
        <li>ZK proofs — contract accepts empty bytes; see README for replacement hooks.</li>
        <li>Eligibility — on-chain allowlist instead of Merkle ZK proof.</li>
        <li>Tally — off-chain computation submitted on-chain without re-verification.</li>
      </ul>

      <h2>Quick links</h2>
      <ul>
        <li><a href="/organiser">Organiser — pin election params</a></li>
        <li><a href="/tallier">Tallier — register FDKG key, post dec share</a></li>
        <li><a href="/voter">Voter — cast encrypted ballot</a></li>
        <li><a href="/results">Results — view tally</a></li>
      </ul>

      <p style={{ marginTop: "2rem", color: "#888", fontSize: "0.85rem" }}>
        Contract: <code>{process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "(not configured)"}</code>
        &nbsp;·&nbsp;
        RPC: <code>{process.env.NEXT_PUBLIC_RPC_URL || "http://localhost:8545"}</code>
      </p>
    </div>
  );
}
