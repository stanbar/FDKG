import { BabyJubPoint, F } from "shared-crypto/index.js"
import { VotingConfig } from "./configs.js"
import { proveBallot, provePVSS } from "./proofs.js"
import { generateSetOfNodes } from "./utils.js"

(async function main() {
  // Get parameters from command line or use defaults.
  // Example usage: ts-node generate_input.ts 150 30 10
  const guardiansThreshold = process.argv[2] ? parseInt(process.argv[2], 10) : 10
  const totalNodes = process.argv[3] ? parseInt(process.argv[3], 10) : 30
  // Define guardians start index and count (for example, guardians are all parties except the first one)
  const guardiansStartIndex = process.argv[4] ? parseInt(process.argv[4], 10) : 2
  const guardiansCount = process.argv[5] ? parseInt(process.argv[5], 10) : totalNodes

  // Create node indices from 1 to totalNodes.
  const nodeIndices = Array.from({ length: totalNodes + 2 }, (_, i) => i + 1)
  // Define guardians indices based on parameters.
  const guardiansIndexes = nodeIndices.slice(guardiansStartIndex - 1, guardiansStartIndex - 1 + guardiansCount)

  const config: VotingConfig = {
    size: nodeIndices.length + 1, // Following original logic.
    options: 2,
    guardiansSize: guardiansIndexes.length,
    guardiansThreshold: guardiansThreshold, // example threshold
    skipProofs: true,
    sequential: false,
  }

  const localParties = generateSetOfNodes(config)
  const party = localParties[0]
  const guardians = guardiansIndexes.map((index) => localParties[index - 1].publicParty)

  const { shares, encryptedShares, votingPublicKey, r1, r2 } = party.createSharesWithoutProofs(guardians)

  for (let i = 0; i < 2; i++) {
    const { proof, publicSignals } = await provePVSS(
      party.polynomial,
      r1,
      r2,
      guardians.map(g => g.publicKey),
      votingPublicKey,
      encryptedShares
    )
  }
  for (const nodeIndex of nodeIndices) {
    const node = localParties[nodeIndex - 1]
    const votingPubKey = party.publicParty.votingPublicKey
    const { C1, C2, cast, r } = node.prepareBallot(votingPublicKey)
    const encryptedBallot = [F.toBigint(C1[0]), F.toBigint(C1[1]), F.toBigint(C2[0]), F.toBigint(C2[1])]
    const { proof, publicSignals } = await proveBallot(votingPublicKey, BigInt(cast), r, encryptedBallot)
  }
})()
