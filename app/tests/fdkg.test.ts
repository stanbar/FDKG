import assert from 'assert';
import { BabyJubPoint, F, PubKey, inCurve, addPoint, decryptResults, encryptShare, evalPolynomial, genKeypair, genPubKey, genRandomSalt } from "shared-crypto";
import { VotingConfig } from '../src/messageboard';
import { EncryptedShare, LocalParty } from '../src/party';

describe("fdkg", () => {
    it("should encrypt and decrypt aggregated encrypted votes", () => {
        const config: VotingConfig = {
            size: 5,
            options: 4,
            guardiansSize: 2,
            guardiansThreshold: 2,
            skipProofs: true,
        }

        if (config.guardiansThreshold > config.size - 1) {
            throw new Error("Guardians threshold must be less than size-1 otherwise it's impossible to reconstruct the secret")
        }


        const nodeIndicies = [1, 2, 3, 4, 5]
        const guardianSets = [
            [1, [2, 3]],
            [2, [1, 4]],
        ]
        const keypairs = Array.from({ length: config.size }, (_, i) => {
            const privKey = BigInt(i)
            const pubKey = genPubKey(privKey)
            return { privKey, pubKey }
        });
        let failed = 0
        let success = 0;
        for (let i = 0; i < 100; i++) {
            // TODO: if I put it outside loop it always fails
            const votingKeypair = Array.from({ length: config.size }, (_, i) => genKeypair());
            const localParties = Array.from({ length: config.size }, (_, i) => {
                return new LocalParty(i + 1, keypairs[i], votingKeypair[i], config)
            });

            const votingPublicKeys: BabyJubPoint[] = []
            const votes: { C1: BabyJubPoint, C2: BabyJubPoint }[] = []
            const sharesFrom: Map<PubKey, Array<EncryptedShare>> = new Map()
            const partialDecryptions: Array<BabyJubPoint> = []

            guardianSets.forEach(([nodeIndex, guardiansIndexes]) => {
                const node = localParties[nodeIndex as number - 1];
                const guardians = (guardiansIndexes as number[]).map((index) => localParties[index - 1].publicParty);
                const r1 = guardians.map((_) => genRandomSalt());
                const r2 = guardians.map((_) => genRandomSalt());

                const shares = guardians.map((_, i) => {
                    const share = evalPolynomial(node.polynomial, BigInt(i + 1))
                    return share
                })
                const encryptedShares = shares.map((share, i): EncryptedShare => {
                    return { guardianPubKey: guardians[i].publicKey, encryptedShare: encryptShare(share, guardians[i].publicKey, r1[i], r2[i]) }
                })
                votingPublicKeys.push(node.publicParty.votingPublicKey)
                // console.log(`Adding new ${encryptedShares.length} encrypted shares from node ${node.publicParty.index}`)
                sharesFrom.set(node.publicParty.publicKey, encryptedShares)
            })

            const votingPublicKey = votingPublicKeys.slice(1).reduce(addPoint, votingPublicKeys[0])

            const casts = Array.from({ length: 4 }, (_, i) => 0n);

            // voting
            nodeIndicies.map((nodeIndex) => {
                const node = localParties[nodeIndex - 1]

                const r = genRandomSalt()
                const { C1, C2, cast } = node.prepareBallot(votingPublicKey, r)
                // console.log(`Node ${nodeIndex} voted for ${cast} option`)

                casts[cast - 1] += 1n

                votes.push({ C1, C2 })
            })
            // console.log({ casts })

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

            // console.log(`Total number of partial decryption from node ${partialDecryptions.length}`)

            // TODO: test if it coffect
            const Z = partialDecryptions.slice(1).reduce((acc, partialDecryption) => {
                return addPoint(acc, partialDecryption)
            }, partialDecryptions[0])

            // TODO: test if it coffect
            const C2 = votes.slice(1).map(v => v.C2).reduce(addPoint, votes[0].C2)

            try {
                const decryptedCasts = decryptResults(Z, C2, config.size, config.options)
                assert.deepEqual(decryptedCasts, casts)
                console.error("✅ Successfully decrypted results")
                success++;
            } catch (e) {
                console.error("😩 Could not decrypt results")
                failed++;
            }
            console.log({ success, failed })
        }
    })

    it("fdk simplified", () => {
        const nodeIndicies = [1, 2, 3]
        const guardianSets = [
            [1, nodeIndicies.filter(i => i != 1)],
        ]
        const config: VotingConfig = {
            size: nodeIndicies.length,
            options: 4,
            guardiansSize: nodeIndicies.length - 1,
            guardiansThreshold: nodeIndicies.length - 1,
            skipProofs: true,
        }

        if (config.guardiansThreshold > config.size - 1) {
            throw new Error("Guardians threshold must be less than size-1 otherwise it's impossible to reconstruct the secret")
        }

        let failed = 0
        let success = 0;
        let sharesThatWork: bigint[] = []
        let sharesThatNotWork: bigint[] = []


        for (let dividor = 1; dividor < 20; dividor++) {
            for (let i = 0; i < 1; i++) {
                const localParties = Array.from({ length: config.size }, (_, i) => {
                    // const privKey = formatPrivKeyForBabyJub(BigInt(i))
                    // const privKey = BigInt('1851')
                    const votingPrivKey = BigInt('6350874878119819312338956282401532410528162663560392320966563075034087161851') + BigInt(dividor)
                    // const privKey = genPrivKey()
                    const votingPubKey = genPubKey(votingPrivKey)
                    const votingKeypair = { privKey: votingPrivKey, pubKey: votingPubKey }


                    // const privKey = BigInt(1n)
                    const privKey = BigInt('6350874878119819312338956282401532410528162663560392320966563075034087161851') + BigInt(dividor)
                    // const privKey = genPrivKey()
                    const pubKey = genPubKey(privKey)
                    const keypair = { privKey, pubKey }

                    const coefficients = Array.from({ length: config.guardiansThreshold }, (_, i) => genRandomSalt())
                    coefficients[0] = keypair.privKey


                    return new LocalParty(i + 1, keypair, votingKeypair, config, coefficients)
                });

                const votingPublicKeys: BabyJubPoint[] = []
                const votes: { C1: BabyJubPoint, C2: BabyJubPoint }[] = []
                const sharesFrom: Map<PubKey, Array<{
                    guardianPubKey: BabyJubPoint;
                    share: bigint;
                }>> = new Map()
                const partialDecryptions: Array<BabyJubPoint> = []

                let aggregatedShares: bigint[] = []
                guardianSets.forEach(([nodeIndex, guardiansIndexes]) => {
                    const node = localParties[nodeIndex as number - 1];
                    const guardians = (guardiansIndexes as number[]).map((index) => localParties[index - 1].publicParty);
                    const r1 = guardians.map((_, i) =>
                        BigInt(i)
                        // genRandomSalt()
                    );
                    const r2 = guardians.map((_, i) =>
                        BigInt(i)
                        // genRandomSalt()
                    );

                    const shares = guardians.map((_, i) => {
                        const share1 = evalPolynomial(node.polynomial, BigInt(i + 1))
                        const share2 = evalPolynomial(node.polynomial, BigInt(i + 1))
                        assert.equal(share1, share2)
                        assert.deepEqual(F.fromBigint(share1), share2)
                        return share1
                    })
                    // prove that the shares can be reconstructed to the secret



                    aggregatedShares = aggregatedShares.concat(shares)
                    votingPublicKeys.push(node.publicParty.votingPublicKey)
                    // console.log(`Adding new ${encryptedShares.length} encrypted shares from node ${node.publicParty.index}`)
                    sharesFrom.set(node.publicParty.publicKey, shares.map((share, i) => {
                        return {
                            guardianPubKey: guardians[i].publicKey,
                            share,
                        }
                    }))
                })

                const votingPublicKey = votingPublicKeys.slice(1).reduce(addPoint, votingPublicKeys[0])

                const casts = Array.from({ length: 4 }, (_, i) => 0n);

                // voting
                nodeIndicies.map((nodeIndex) => {
                    const node = localParties[nodeIndex - 1]
                    const r = BigInt(nodeIndex)
                    const { C1, C2, cast } = node.prepareBallot(votingPublicKey, r)
                    // console.log(`Node ${nodeIndex} voted for ${cast} option`)

                    casts[cast - 1] += 1n

                    votes.push({ C1, C2 })
                })
                // console.log({ casts })

                // tally
                const C1 = votes.slice(1).map(v => v.C1).reduce(addPoint, votes[0].C1)

                nodeIndicies.forEach((nodeIndex) => {
                    const node = localParties[nodeIndex - 1]

                    const sharesForNode: Array<{
                        guardianPubKey: BabyJubPoint;
                        share: bigint;
                    } & { index: number, sharesSize: number }> = []

                    for (let [from, tos] of sharesFrom) {
                        const index = tos.findIndex(to => to.guardianPubKey === node.publicParty.publicKey)
                        if (index != -1) {
                            sharesForNode.push({ index: index + 1, sharesSize: tos.length, ...tos[index] })
                        }
                    }

                    // console.log(`Taller ${nodeIndex} received ${sharesForNode.length} shares`)
                    sharesForNode.forEach(share => {
                        const partialDecryption = node.partialDecryptionForShare(C1, share.share, share.index, share.sharesSize)
                        partialDecryptions.push(partialDecryption)
                    })

                })

                // console.log(`Total number of partial decryption from node ${partialDecryptions.length}`)

                // TODO: test if it coffect
                const Z = partialDecryptions.slice(1).reduce(addPoint, partialDecryptions[0])
                assert(inCurve(Z))

                // TODO: test if it coffect
                const C2 = votes.slice(1).map(v => v.C2).reduce(addPoint, votes[0].C2)
                assert(inCurve(C2))

                try {
                    const decryptedCasts = decryptResults(Z, C2, config.size, config.options)
                    assert.deepEqual(decryptedCasts, casts)
                    console.error("✅ Successfully decrypted results")
                    console.log({ aggregatedShares })
                    sharesThatWork = sharesThatWork.concat(aggregatedShares.reduce((acc, ele) => acc + ele, 0n))
                    success++;
                } catch (e) {
                    console.error("😩 Could not decrypt results")
                    console.log({ aggregatedShares })
                    sharesThatNotWork = sharesThatNotWork.concat(aggregatedShares.reduce((acc, ele) => acc + ele, 0n))
                    failed++;
                }
                console.log({ success, failed })
            }
        }
        console.log({ sharesThatWork, sharesThatNotWork })
    })

    it("should encrypt and decrypt aggregated encrypted votes", () => {
        const nodeIndicies = [1, 2, 3]
        const guardianSets = [
            [1, nodeIndicies.filter(i => i != 1)],
        ]
        const config: VotingConfig = {
            size: nodeIndicies.length,
            options: 4,
            guardiansSize: nodeIndicies.length - 1,
            guardiansThreshold: nodeIndicies.length - 1,
            skipProofs: true,
        }

        if (config.guardiansThreshold > config.size - 1) {
            throw new Error("Guardians threshold must be less than size-1 otherwise it's impossible to reconstruct the secret")
        }

        let failed = 0
        let success = 0;
        let sharesThatWork: bigint[] = []
        let sharesThatNotWork: bigint[] = []


        for (let dividor = 1; dividor < 20; dividor++) {
            for (let i = 0; i < 1; i++) {
                const localParties = Array.from({ length: config.size }, (_, i) => {
                    // const privKey = formatPrivKeyForBabyJub(BigInt(i))
                    // const privKey = BigInt('1851')
                    const votingPrivKey = BigInt('6350874878119819312338956282401532410528162663560392320966563075034087161851') + BigInt(dividor)
                    // const privKey = genPrivKey()
                    const votingPubKey = genPubKey(votingPrivKey)
                    const votingKeypair = { privKey: votingPrivKey, pubKey: votingPubKey }


                    // const privKey = BigInt(1n)
                    const privKey = BigInt('6350874878119819312338956282401532410528162663560392320966563075034087161851') + BigInt(dividor)
                    // const privKey = genPrivKey()
                    const pubKey = genPubKey(privKey)
                    const keypair = { privKey, pubKey }

                    const coefficients = Array.from({ length: config.guardiansThreshold }, (_, i) => genRandomSalt())
                    coefficients[0] = keypair.privKey


                    return new LocalParty(i + 1, keypair, votingKeypair, config, coefficients)
                });

                const votingPublicKeys: BabyJubPoint[] = []
                const votes: { C1: BabyJubPoint, C2: BabyJubPoint }[] = []
                const sharesFrom: Map<PubKey, Array<EncryptedShare>> = new Map()
                const partialDecryptions: Array<BabyJubPoint> = []

                let aggregatedShares: bigint[] = []
                guardianSets.forEach(([nodeIndex, guardiansIndexes]) => {
                    const node = localParties[nodeIndex as number - 1];
                    const guardians = (guardiansIndexes as number[]).map((index) => localParties[index - 1].publicParty);
                    const r1 = guardians.map((_, i) =>
                        BigInt(i)
                        // genRandomSalt()
                    );
                    const r2 = guardians.map((_, i) =>
                        BigInt(i)
                        // genRandomSalt()
                    );

                    const shares = guardians.map((_, i) => {
                        const share1 = evalPolynomial(node.polynomial, BigInt(i + 1))
                        const share2 = evalPolynomial(node.polynomial, BigInt(i + 1))
                        assert.equal(share1, share2)
                        assert.deepEqual(F.fromBigint(share1), share2)
                        return share1
                    })

                    aggregatedShares = aggregatedShares.concat(shares)
                    const encryptedShares = shares.map((share, i): EncryptedShare => {
                        return {
                            guardianPubKey: guardians[i].publicKey,
                            encryptedShare: encryptShare(share, guardians[i].publicKey, r1[i], r2[i])
                        }
                    })
                    votingPublicKeys.push(node.publicParty.votingPublicKey)
                    // console.log(`Adding new ${encryptedShares.length} encrypted shares from node ${node.publicParty.index}`)
                    sharesFrom.set(node.publicParty.publicKey, encryptedShares)
                })

                const votingPublicKey = votingPublicKeys.slice(1).reduce(addPoint, votingPublicKeys[0])

                const casts = Array.from({ length: 4 }, (_, i) => 0n);

                // voting
                nodeIndicies.map((nodeIndex) => {
                    const node = localParties[nodeIndex - 1]
                    const r = BigInt(nodeIndex)
                    const { C1, C2, cast } = node.prepareBallot(votingPublicKey, r)
                    // console.log(`Node ${nodeIndex} voted for ${cast} option`)

                    casts[cast - 1] += 1n

                    votes.push({ C1, C2 })
                })
                // console.log({ casts })

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

                // console.log(`Total number of partial decryption from node ${partialDecryptions.length}`)

                // TODO: test if it coffect
                const Z = partialDecryptions.slice(1).reduce(addPoint, partialDecryptions[0])
                assert(inCurve(Z))

                // TODO: test if it coffect
                const C2 = votes.slice(1).map(v => v.C2).reduce(addPoint, votes[0].C2)
                assert(inCurve(C2))

                try {
                    const decryptedCasts = decryptResults(Z, C2, config.size, config.options)
                    assert.deepEqual(decryptedCasts, casts)
                    console.error("✅ Successfully decrypted results")
                    console.log({ aggregatedShares })
                    sharesThatWork = sharesThatWork.concat(aggregatedShares.reduce((acc, ele) => acc + ele, 0n))
                    success++;
                } catch (e) {
                    console.error("😩 Could not decrypt results")
                    console.log({ aggregatedShares })
                    sharesThatNotWork = sharesThatNotWork.concat(aggregatedShares.reduce((acc, ele) => acc + ele, 0n))
                    failed++;
                }
                console.log({ success, failed })
            }
        }
        console.log({ sharesThatWork, sharesThatNotWork })
    })
});