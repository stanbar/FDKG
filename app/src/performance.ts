import { VotingConfig } from "./configs.js"
import { provePVSS } from "./proofs.js"
import { generateSetOfNodes } from "./utils.js"

(async function main() {
    // Get parameters from command line or use defaults.
    // Example usage: ts-node generate_input.ts 150 30 10
    const totalNodes = 50
    const guardiansThreshold = 15
    // Define guardians start index and count (for example, guardians are all parties except the first one)
    const guardiansStartIndex = process.argv[3] ? parseInt(process.argv[3], 10) : 2
    const guardiansCount = process.argv[4] ? parseInt(process.argv[4], 10) : totalNodes

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

    const { proof, publicSignals } = await provePVSS(
      party.polynomial,
      r1,
      r2,
      guardians.map(g => g.publicKey),
      votingPublicKey,
      encryptedShares
    )
  })()