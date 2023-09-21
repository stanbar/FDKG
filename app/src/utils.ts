import { genKeypair, genPubKey } from "shared-crypto";
import { VotingConfig } from "./messageboard";
import { LocalParty } from "./party";
import { evalPolynomialZ, randomPolynomialZ } from "shared-crypto/src/sss";

export const generateSetOfNodes = (config: VotingConfig): LocalParty[] => {
    if (config.guardiansThreshold > config.size - 1) {
        throw new Error("Guardians threshold must be less than size-1 otherwise it's impossible to reconstruct the secret")
    }
    const localParties = Array.from({ length: config.size }, (_, i) => {
            const poly = randomPolynomialZ(config.guardiansThreshold)
            const votingPrivKey = evalPolynomialZ(poly, 0n)
            const votingPubKey = genPubKey(votingPrivKey)
            const votingKeypair = { privKey: votingPrivKey, pubKey: votingPubKey }

            const keypair = genKeypair()
            return new LocalParty(i + 1, keypair, votingKeypair, config, poly)
    });
    return localParties
}