# FDKG-Vote-BC PoC

A minimal end-to-end demonstrator of the **FDKG-Vote-BC** protocol from the accompanying PhD thesis.

Source of truth: `04b-protocols.tex §sec:fdkg-vote-bc` and `05a-fdkg-protocol.tex §sec:fdkg-full`.

---

## Directory layout

```
poc/
  contracts/
    FDKGVoteGW.sol           # main election state-machine contract
    lib/
      BabyJub.sol            # twisted-Edwards point addition (BN254 field)
  test/
    FDKGVoteGW.t.sol         # Foundry integration tests (11 tests)
  script/
    Deploy.s.sol             # broadcast-deploy + optional demo pinParams
  webapp/
    app/                     # Next.js pages (organiser / tallier / voter / results)
    lib/
      crypto.ts              # off-chain crypto ops (wraps shared-crypto)
      contract.ts            # viem ABI + read/write helpers
      types.ts               # shared TypeScript types
    scripts/
      e2e.ts                 # headless end-to-end test (no browser)
  foundry.toml
  README.md  ← you are here
```

---

## Protocol overview

| Phase | Time window | Action |
|-------|-------------|--------|
| Keygen | `[deploy, tOpen)` | Each tallier calls `postFDKGGen` — partial pubkey + encrypted Shamir shares |
| Voting | `[tOpen, tClose)` | Eligible voters call `castBallot` — ElGamal encrypted choice + nullifier |
| Decryption | `[tClose, ∞)` | Online talliers call `postDecShare`; guardians call `postReconShare` for offline talliers |
| Tally | after `tClose` | Anyone calls `finalizeTally` once `enoughDecMaterial` is true |

The election public key **E = Σ Eᵢ** (BabyJub point sum) is aggregated **on-chain** as each tallier posts their partial key.

---

## Mocked pieces

| Component | What the PoC does | Production replacement |
|-----------|-------------------|------------------------|
| `_verifyFDKGProof` | Accepts any bytes; always passes | Circom PVSS Groth16 verifier contract |
| `_verifyCastProof` | Same | Circom ballot + Merkle membership verifier |
| `_verifyDecProof` | Same | DLEQ (Chaum-Pedersen) on-chain verifier |
| `_verifyReconProof` | Same | Proof of correct ElGamal decryption |
| Eligibility check | On-chain `eligible[eid][addr]` mapping (`addEligible`) | `MerkleProof.verify(proof, merkleRoot, leaf)` |
| Nullifier | `keccak256(sk ‖ eid ‖ "cast")` | Poseidon hash inside ZK cast circuit |
| Tally submission | Off-chain result accepted as-is | Re-derive on-chain or ZK tally proof |
| Discrete log | Exhaustive search (≤ 20 voters, `decryptResults`) | Baby-step giant-step or off-chain service |

---

## Run commands

### Contracts

```bash
# Build
cd poc && forge build

# Test (all 11 tests should pass)
cd poc && forge test -vv

# Start local Anvil node
anvil &

# Deploy to local Anvil
cd poc && forge script script/Deploy.s.sol --rpc-url http://localhost:8545 --broadcast
```

### Webapp

```bash
cd poc/webapp && npm install

# Development server (http://localhost:3000)
cd poc/webapp && npm run dev

# Headless end-to-end test (requires Anvil running)
cd poc/webapp && DEPLOY=true npx tsx scripts/e2e.ts
```

The `DEPLOY=true` flag makes the e2e script deploy a fresh contract. Alternatively:

```bash
CONTRACT_ADDRESS=0x<addr> npx tsx scripts/e2e.ts
```

---

## End-to-end test walkthrough

`scripts/e2e.ts` exercises the full protocol against a local Anvil node:

1. Deploy `FDKGVoteGW`
2. `pinParams` — set `tOpen`, `tClose`, `tRec = 2`
3. `addEligible` — register 3 voter addresses
4. Two talliers call `postFDKGGen` with real BabyJub keypairs + Shamir-split encrypted shares
5. Advance chain time past `tOpen`
6. Three voters cast real ElGamal-encrypted ballots (choices: 1, 2, 1)
7. Duplicate nullifier attempt → verified rejection
8. Advance chain time past `tClose`
9. Tallier 1 calls `postDecShare` (PD₁ = sk₁ · aggC1)
10. Tallier 2 is "offline" — guardian 1 and guardian 2 call `postReconShare`
11. Off-chain: reconstruct sk₂ from guardian shares via Lagrange SSS; compute PD₂ = sk₂ · aggC1; combine with PD₁; run exhaustive discrete log
12. `finalizeTally` — store result on-chain
13. Assert on-chain tally = `[2, 1]` ✓

---

## Key files

| File | Purpose |
|------|---------|
| `contracts/FDKGVoteGW.sol` | Election state machine; all protocol phases |
| `contracts/lib/BabyJub.sol` | Twisted-Edwards addition used for on-chain key aggregation |
| `test/FDKGVoteGW.t.sol` | 11 Foundry tests covering all phases + edge cases |
| `webapp/lib/crypto.ts` | Off-chain crypto: keygen, ballot encryption, partial decryption, tally |
| `webapp/lib/contract.ts` | viem ABI + typed read/write wrappers |
| `webapp/scripts/e2e.ts` | Complete end-to-end election with real BabyJub arithmetic |
