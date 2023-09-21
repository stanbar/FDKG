import assert from 'assert';
import { BabyJubPoint, F, PubKey, inCurve, addPoint, decryptResults, encryptShare, genKeypair, genPubKey, genRandomSalt, sss } from "shared-crypto";
import { VotingConfig } from '../src/messageboard';
import { EncryptedShare, LocalParty } from '../src/party';
import { randomPolynomialZ, evalPolynomialZ, generateSharesZ, recoverZ } from 'shared-crypto/src/sss';

describe("fdkg", () => {
    it.only("should encrypt and decrypt aggregated encrypted votes", () => {
        // const nodeIndicies = [1, 2, 3, 4, 5]
        // const guardianSets = [
        //     [1, nodeIndicies.filter(i => i != 1)],
        //     [2, nodeIndicies.filter(i => i != 2)],
        //     [3, nodeIndicies.filter(i => i != 3)],
        //     [4, nodeIndicies.filter(i => i != 4)],
        //     [5, nodeIndicies.filter(i => i != 5)],
        // ]
        const nodeIndicies = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        const guardianSets = [
            [1, [1, 2, 3, 6]],
            [4, [4, 3, 5, 6]],
            [8, [8, 5, 6, 7]],
            [10, [10, 7, 8, 9]]
        ]
        const config: VotingConfig = {
            size: nodeIndicies.length,
            options: 4,
            guardiansSize: 4,
            guardiansThreshold: 3,
            skipProofs: true,
        }

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

        const votingPublicKeys: BabyJubPoint[] = []
        const votes: { C1: BabyJubPoint, C2: BabyJubPoint }[] = []
        const sharesFrom: Map<PubKey, Array<EncryptedShare>> = new Map()
        const partialDecryptions: Array<BabyJubPoint> = []

        let aggregatedShares: bigint[] = []
        guardianSets.forEach(([nodeIndex, guardiansIndexes]) => {
            const node = localParties[nodeIndex as number - 1];
            const guardians = (guardiansIndexes as number[]).map((index) => localParties[index - 1].publicParty);
            const r1 = guardians.map(genRandomSalt);
            const r2 = guardians.map(genRandomSalt);

            const shares = guardians.map((_, i) => {
                return sss.evalPolynomialZ(node.polynomial, BigInt(i + 1))
            })

            aggregatedShares = aggregatedShares.concat(shares)
            const encryptedShares = shares.map((share, i): EncryptedShare => {
                return {
                    guardianPubKey: guardians[i].publicKey,
                    encryptedShare: encryptShare(share, guardians[i].publicKey, r1[i], r2[i])
                }
            })
            votingPublicKeys.push(node.publicParty.votingPublicKey)
            sharesFrom.set(node.publicParty.publicKey, encryptedShares)
        })

        const votingPublicKey = votingPublicKeys.slice(1).reduce(addPoint, votingPublicKeys[0])

        const casts = Array.from({ length: 4 }, (_, i) => 0n);

        // voting
        nodeIndicies.map((nodeIndex) => {
            const node = localParties[nodeIndex - 1]
            const r = BigInt(nodeIndex)
            const { C1, C2, cast } = node.prepareBallot(votingPublicKey, r)
            casts[cast - 1] += 1n
            votes.push({ C1, C2 })
        })

        // tally
        const C1 = votes.slice(1).map(v => v.C1).reduce(addPoint, votes[0].C1)

        nodeIndicies.forEach((nodeIndex) => {
            const node = localParties[nodeIndex - 1]

            const sharesForNode: Array<EncryptedShare & { index: number, sharesSize: number }> = []

            for (let [from, tos] of sharesFrom) {
                const index = tos.findIndex(to => to.guardianPubKey === node.publicParty.publicKey)
                if (index != -1) {
                    sharesForNode.push({ index: index + 1, sharesSize: tos.length, ...tos[index] })
                }
            }

            // console.log(`Taller ${nodeIndex} received ${sharesForNode.length} shares`)
            sharesForNode.forEach(share => {
                const partialDecryption = node.partialDecryptionForEncryptedShare(C1, share)
                partialDecryptions.push(partialDecryption)
            })

        })

        const Z = partialDecryptions.slice(1).reduce(addPoint, partialDecryptions[0])
        assert(inCurve(Z))

        const C2 = votes.slice(1).map(v => v.C2).reduce(addPoint, votes[0].C2)
        assert(inCurve(C2))

        try {
            const decryptedCasts = decryptResults(Z, C2, config.size, config.options)
            assert.deepEqual(decryptedCasts, casts)
            console.error("✅ Successfully decrypted results")
        } catch (e) {
            console.error("😩 Could not decrypt results")
        }
    })
});