import { F, genKeypair } from "shared-crypto";
import { VotingConfig } from "./messageboard";
import { LocalParty } from "./party";

export const generateSetOfNodes = (config: VotingConfig): LocalParty[] => {
    if (config.guardiansThreshold > config.size - 1) {
        throw new Error("Guardians threshold must be less than size-1 otherwise it's impossible to reconstruct the secret")
    }
    const keypairs = Array.from({ length: config.size }, (_, i) => genKeypair());
    const votingKeypair = Array.from({ length: config.size }, (_, i) => genKeypair());
    const localParties = Array.from({ length: config.size }, (_, i) => {
        return new LocalParty(i + 1, keypairs[i], votingKeypair[i], config)
    });
    return localParties
}