import assert from 'assert';
import { BabyJubPoint, PubKey, inCurve, addPoint, decryptResults, mulPointEscalar } from "shared-crypto";
import { VotingConfig } from '../src/messageboard';
import { EncryptedShare } from '../src/party';
import { PointZero } from 'shared-crypto/src/F';
import { generateSetOfNodes } from '../src/utils';
import { LagrangeCoefficient, recoverZ } from 'shared-crypto/src/sss';
import _, { partial } from 'lodash';

describe("fdkg", () => {
    it("should perform fdkg without proofs", () => {
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
        const talliers = [3, 6, 7, 8]
        const config: VotingConfig = {
            size: nodeIndicies.length,
            options: 4,
            guardiansSize: 4,
            guardiansThreshold: 2,
            skipProofs: true,
        }

        if (config.guardiansThreshold > config.size - 1) {
            throw new Error("Guardians threshold must be less than size-1 otherwise it's impossible to reconstruct the secret")
        }

        const localParties = generateSetOfNodes(config)

        const votingPublicKeys: BabyJubPoint[] = []
        const votes: { C1: BabyJubPoint, C2: BabyJubPoint }[] = []
        const sharesFrom: Map<PubKey, Array<EncryptedShare>> = new Map()
        const partialDecryptionFor: Map<PubKey, Array<{ senderPubKey: PubKey, pd: BabyJubPoint }>> = new Map()
        const partialDecryptions: Array<BabyJubPoint> = []

        guardianSets.forEach(([nodeIndex, guardiansIndexes]) => {
            const node = localParties[nodeIndex as number - 1];
            const guardians = (guardiansIndexes as number[]).map((index) => localParties[index - 1].publicParty);

            const { encryptedShares, shares } = node.createSharesWithoutProofs(guardians)
            assert.equal(recoverZ(_.sampleSize(shares, config.guardiansThreshold), config.guardiansSize, config.guardiansThreshold), node.votingKeypair.privKey)
            votingPublicKeys.push(node.publicParty.votingPublicKey)
            sharesFrom.set(node.publicParty.publicKey, encryptedShares)
        })

        const votingPublicKey = votingPublicKeys.reduce(addPoint, PointZero)

        const casts = Array.from({ length: 4 }, (_, i) => 0n);

        // voting
        nodeIndicies.map((nodeIndex) => {
            const node = localParties[nodeIndex - 1]
            const { C1, C2, cast } = node.prepareBallot(votingPublicKey)
            casts[cast - 1] += 1n
            votes.push({ C1, C2 })
        })

        // tally
        const C1 = votes.map(v => v.C1).reduce(addPoint, PointZero)

        talliers.forEach((nodeIndex) => {
            const node = localParties[nodeIndex - 1]
            if (!node) {
                throw new Error(`Node ${nodeIndex - 1} not found in ${localParties}`)
            }

            // collect shares
            const shares: Array<{share: EncryptedShare, from: PubKey}> = []
            for (let [from, tos] of sharesFrom) {
                const index = tos.findIndex(to => to.guardianPubKey === node.publicParty.publicKey)
                if (index != -1) {
                    console.log(`node ${nodeIndex} found share from ${localParties.findIndex(p => p.publicParty.publicKey == from) + 1}`)
                    const share = tos[index]
                    shares.push({ share, from})
                }
            }
            // publish partial decryptions
            shares.forEach(({ share, from }) => {
                const pd = node.partialDecryptionForEncryptedShare(C1, share)
                partialDecryptionFor.has(from) ?
                    partialDecryptionFor.get(from)?.push({ senderPubKey: node.publicParty.publicKey, pd }) :
                    partialDecryptionFor.set(from, [{ senderPubKey: node.publicParty.publicKey, pd }])
            })
        })


        for (let [from, pds] of partialDecryptionFor) {
            // nodes of participants
            const nodes: { pd: BabyJubPoint, shareIndex: number }[] = []
            for (let { senderPubKey, pd } of pds) {
                const shareIndex = sharesFrom.get(from)?.findIndex(share => share.guardianPubKey === senderPubKey)
                if (shareIndex == undefined) {
                    throw new Error("Partial decryption for share of party that did not contribute to dkg")
                }
                if (shareIndex == -1) {
                    throw new Error("Partial decryption from node that didn't received the share")
                }
                nodes.push({ pd, shareIndex: shareIndex + 1 })
            }

            const partialDecryption = nodes.reduce((acc, { pd, shareIndex }) => {
                const lagrangeCoeff = LagrangeCoefficient(shareIndex, nodes.map(n => n.shareIndex ))
                return addPoint(acc, mulPointEscalar(pd, lagrangeCoeff))
            }, PointZero)
            partialDecryptions.push(partialDecryption)
        }
        // offline tally
        const Z = partialDecryptions.reduce(addPoint, PointZero)
        assert(inCurve(Z))

        const C2 = votes.map(v => v.C2).reduce(addPoint, PointZero)
        assert(inCurve(C2))

        try {
            const decryptedCasts = decryptResults(Z, C2, config.size, config.options)
            assert.deepEqual(decryptedCasts, casts)
        } catch (e) {
            assert(!e, "😩 Could not decrypt results")
        }
    })
});