import { Base8, F, BabyJubPoint, inCurve, addPoint, decryptResults, encryptBallot, genRandomSalt, mulPointEscalar, fkdg, genPrivKey } from "shared-crypto";
import { LagrangeCoefficient, evalPolynomialZ, generateSharesZ, randomPolynomialZ, recoverZ } from "../src/sss";
import assert from "node:assert";
import { PointZero } from "../src/F";
import * as F_Base8 from "../src/FBase8";
import _ from "lodash";

describe('Shamir Secret Sharing', () => {

    it("Lagrange basis are constant for Q", async () => {
        {
            const Q = [1]
            const l_1 = LagrangeCoefficient(1, Q)
            assert.equal(l_1, 1n)
        }
        {
            const Q = [1,2]
            const l_1 = LagrangeCoefficient(1, Q)
            assert.equal(l_1, 2n)

            const l_2 = LagrangeCoefficient(2, Q)
            // (p-1)^-1
            assert.equal(l_2, F_Base8.inv(F_Base8.BABYJUB_BASE8_ORDER - 1n))
        }
        {
            const Q = [1, 2, 3]

            const l_1 = LagrangeCoefficient(1, Q)
            assert.equal(l_1, 3n)

            const l_2 = LagrangeCoefficient(2, Q)
            // 3*(p-1)^-1
            assert.equal(l_2, F_Base8.mul(3n, F_Base8.inv(F_Base8.BABYJUB_BASE8_ORDER - 1n)))

            const l_3 = LagrangeCoefficient(3, Q)
            // (p^2-3p+2)^-1 * 2
            const p2 = F_Base8.mul(F_Base8.BABYJUB_BASE8_ORDER, F_Base8.BABYJUB_BASE8_ORDER)
            const p3 = F_Base8.mul(3n, F_Base8.BABYJUB_BASE8_ORDER)
            const p2p3 = F_Base8.add(F_Base8.sub(p2, p3), 2n)
            const p2p3Inv = F_Base8.inv(p2p3)
            F_Base8.mul(p2p3Inv, 2n)
            assert.equal(l_3, F_Base8.mul(p2p3Inv, 2n))
        }
        {
            const Q = [2,3]
            const l_2 = LagrangeCoefficient(2, Q)
            assert.equal(l_2, 3n)

            const l_3 = LagrangeCoefficient(3, Q)
            // (p-1)^-1 * 2
            assert.equal(l_3, F_Base8.mul(2n, F_Base8.inv(F_Base8.BABYJUB_BASE8_ORDER - 1n)))
        }
    })

    it("should split and recover", async () => {
        for (let i = 1; i <= 3; i++) {
            const secret = F_Base8.e(i)
            const THRESHOLD = i;
            const poly = randomPolynomialZ(THRESHOLD, secret)
            const SHARES_SIZE = i + 1;
            const shares = generateSharesZ(poly, SHARES_SIZE)
            const recovered = recoverZ(shares, SHARES_SIZE, THRESHOLD)
            assert.equal(secret, recovered)
            assert.deepEqual(secret, recovered)
        }
    })

    it("sss m-of-n", async () => {
        for (let i = 1; i < 10; i++) {
            const secret = F_Base8.e(i)
            const THRESHOLD = i;
            const poly = randomPolynomialZ(THRESHOLD, secret)
            const SHARES_SIZE = i + 2;
            const shares = generateSharesZ(poly, SHARES_SIZE)
            const collectedShares = _.sampleSize(shares, THRESHOLD + 1)
            const recovered = recoverZ(collectedShares, SHARES_SIZE, THRESHOLD)
            assert.equal(secret, recovered, `[${i}] secret ${secret} should be equal to recovered ${recovered}`)
            assert.deepEqual(secret, recovered)
        }
    })

    it("adding scalars and multplying by point", async () => {
        const factor1 = F_Base8.mul(F_Base8.e(3), LagrangeCoefficient(1, [1,2]))
        const factor2 = F_Base8.mul(F_Base8.e(4), LagrangeCoefficient(2, [1,2]))
        assert.deepEqual(F_Base8.add(factor1, factor2), F_Base8.e(2))

        const g1 = mulPointEscalar(Base8, F_Base8.toBigint(factor1))
        const g2 = mulPointEscalar(Base8, F_Base8.toBigint(factor2))
        assert.deepEqual(addPoint(g1, g2), mulPointEscalar(Base8, 2))
    })
    it("encrypt one dealer many votes and two dkgs", async () => {
        const VOTERS = 10 as const;
        const OPTIONS = 4 as const;
        const THRESHOLD = 2;
        const SHARES_SIZE = 3;

        assert(SHARES_SIZE >= THRESHOLD, `SHARES_SIZE ${SHARES_SIZE} should be equal or greater than THRESHOLD ${THRESHOLD}`)

        let casts = Array.from({ length: OPTIONS }, (_, i) => 0n);

        const poly1 = randomPolynomialZ(THRESHOLD)
        const secret1 = evalPolynomialZ(poly1, 0n)
        const shares1 = generateSharesZ(poly1, SHARES_SIZE)

        assert.deepEqual(recoverZ(_.sampleSize(shares1, THRESHOLD), SHARES_SIZE, THRESHOLD), secret1)
        const votingPrivKey = secret1
        const votingPubKey = mulPointEscalar(Base8, votingPrivKey)

        const C1s: BabyJubPoint[] = []
        const C2s: BabyJubPoint[] = []

        for (let voter = 0; voter < VOTERS; voter++) {
            const cast = (voter % OPTIONS) + 1
            casts[cast - 1] += 1n

            const r = genRandomSalt()

            const [C1, C2] = encryptBallot(votingPubKey, BigInt(cast), r, VOTERS, OPTIONS)
            C1s.push(C1)
            C2s.push(C2)
        }

        const C1 = C1s.slice(1).reduce(addPoint, C1s[0])
        const C2 = C2s.slice(1).reduce(addPoint, C2s[0])


        const partialDecryptions = Array.from({ length: SHARES_SIZE }, (_, dkgPartyIndex) => {
            const sharesForDkgParty = [shares1[dkgPartyIndex]]

            // TODO: can I hardcode it [1,2,3,4].map(x => BigInt(x)) ? I know the shars size and threshold it's always fixed also I know the index of each share
            // I may want user to pick different number, I should not force him to use 4
            // But can I assume the shares are ordered? Yes, they are proved in the circuit
            // Once party publishes shares, they are ordered, so the lagrange basis is always the same

            const dkgVotingPrivKeyShare = sharesForDkgParty.reduce((acc, share, i) => {
                const lagrangeBasis = LagrangeCoefficient(share.x, Array.from({ length: SHARES_SIZE }, (_, i) => i + 1))
                const lagrangeWithShare = F_Base8.mul(lagrangeBasis, share.y)
                return F_Base8.add(acc, lagrangeWithShare)
            }, F_Base8.zero)

            return mulPointEscalar(C1, dkgVotingPrivKeyShare)
        })

        const sC1 = partialDecryptions.reduce(addPoint, PointZero)
        assert(inCurve(sC1))

        assert.deepEqual(sC1, mulPointEscalar(C1, votingPrivKey))

        const decryptedCasts = decryptResults(sC1, C2, VOTERS, OPTIONS)
        assert.deepEqual(decryptedCasts, casts)
    })

    it("encrypt two dealers many votes and three dkgs", async () => {
        const VOTERS = 10 as const;
        const OPTIONS = 4 as const;
        const SHARES_SIZE = 4;
        const THRESHOLD = 4;

        assert(SHARES_SIZE >= THRESHOLD, `SHARES_SIZE ${SHARES_SIZE} should be equal or greater than THRESHOLD ${THRESHOLD}`)

        let casts = Array.from({ length: OPTIONS }, (_, i) => 0n);

        const poly1 = randomPolynomialZ(THRESHOLD)
        const secret1 = evalPolynomialZ(poly1, 0n)
        const shares1 = generateSharesZ(poly1, SHARES_SIZE)

        assert.deepEqual(recoverZ(_.sampleSize(shares1, THRESHOLD), SHARES_SIZE, THRESHOLD), secret1)

        const poly2 = randomPolynomialZ(THRESHOLD)
        const secret2 = evalPolynomialZ(poly2, 0n)
        const shares2 = generateSharesZ(poly2, SHARES_SIZE)

        assert.deepEqual(recoverZ(_.sampleSize(shares2, THRESHOLD), SHARES_SIZE, THRESHOLD), secret2)

        const votingPrivKey = F.toBigint(F.add(F.fromBigint(secret1), F.fromBigint(secret2)))
        const votingPubKey = mulPointEscalar(Base8, votingPrivKey)

        const C1s: BabyJubPoint[] = []
        const C2s: BabyJubPoint[] = []

        for (let voter = 0; voter < VOTERS; voter++) {
            const cast = (voter % OPTIONS) + 1
            casts[cast - 1] += 1n

            const r = genRandomSalt()

            const [C1, C2] = encryptBallot(votingPubKey, BigInt(cast), r, VOTERS, OPTIONS)
            C1s.push(C1)
            C2s.push(C2)
        }

        const C1 = C1s.slice(1).reduce(addPoint, C1s[0])
        const C2 = C2s.slice(1).reduce(addPoint, C2s[0])


        const partialDecryptions = Array.from({ length: SHARES_SIZE }, (_, dkgPartyIndex) => {
            const sharesForDkgParty = [shares1[dkgPartyIndex], shares2[dkgPartyIndex]]

            const dkgVotingPrivKeyShare = sharesForDkgParty.reduce((acc, share) => {
                const lagrangeBasis = LagrangeCoefficient(share.x, Array.from({ length: SHARES_SIZE }, (_, i) => i + 1))
                const lagrangeWithShare = F_Base8.mul(lagrangeBasis, share.y)
                return F_Base8.add(acc, lagrangeWithShare)
            }, F_Base8.zero)

            return mulPointEscalar(C1, dkgVotingPrivKeyShare)
        })

        const sC1 = partialDecryptions.reduce(addPoint, PointZero)
        assert(inCurve(sC1))

        assert.deepEqual(sC1, mulPointEscalar(C1, votingPrivKey))

        const decryptedCasts = decryptResults(sC1, C2, VOTERS, OPTIONS)
        assert.deepEqual(decryptedCasts, casts)
    })

    it("encrypt two dealers many votes and three dkgs with poly and secrets in F_r", async () => {
        const VOTERS = 10 as const;
        const OPTIONS = 4 as const;
        const THRESHOLD = 3;
        const SHARES_SIZE = 4;

        assert(SHARES_SIZE >= THRESHOLD, `SHARES_SIZE ${SHARES_SIZE} should be equal or greater than THRESHOLD ${THRESHOLD}`)


            let casts = Array.from({ length: OPTIONS }, (_, i) => 0n);
            const secret1 = genPrivKey() % F_Base8.BABYJUB_BASE8_ORDER
            const poly1 = randomPolynomialZ(THRESHOLD, secret1)
            assert.deepEqual(secret1, evalPolynomialZ(poly1, 0n))
            const shares1 = generateSharesZ(poly1, SHARES_SIZE)

            assert.deepEqual(recoverZ(_.sampleSize(shares1, THRESHOLD), SHARES_SIZE, THRESHOLD), secret1)

            const secret2 = genPrivKey() % F_Base8.BABYJUB_BASE8_ORDER
            const poly2 = randomPolynomialZ(THRESHOLD, secret2)
            assert.deepEqual(secret2, evalPolynomialZ(poly2, 0n))
            const shares2 = generateSharesZ(poly2, SHARES_SIZE)
            assert.deepEqual(recoverZ(_.sampleSize(shares2, THRESHOLD), SHARES_SIZE, THRESHOLD), secret2)

            const votingPrivKey = F.toBigint(F.add(F.fromBigint(secret1), F.fromBigint(secret2)))
            const votingPubKey = mulPointEscalar(Base8, votingPrivKey)

            const C1s: BabyJubPoint[] = []
            const C2s: BabyJubPoint[] = []

            for (let voter = 0; voter < VOTERS; voter++) {
                const cast = (voter % OPTIONS) + 1
                casts[cast - 1] += 1n

                const r = genRandomSalt()

                const [C1, C2] = encryptBallot(votingPubKey, BigInt(cast), r, VOTERS, OPTIONS)
                C1s.push(C1)
                C2s.push(C2)
            }

            const C1 = C1s.reduce(addPoint, PointZero)
            const C2 = C2s.reduce(addPoint, PointZero)


            const partialDecryptions = Array.from({ length: SHARES_SIZE }, (_, dkgPartyIndex) => {
                const sharesForDkgParty = [shares1[dkgPartyIndex], shares2[dkgPartyIndex]]
                const dkgVotingPrivKeyShare = sharesForDkgParty.reduce((acc, share, i) => {
                    const lagrangeBasis = LagrangeCoefficient(share.x, Array.from({ length: SHARES_SIZE }, (_, i) => i + 1))
                    const lagrangeWithShare = F_Base8.mul(lagrangeBasis, share.y)
                    return F_Base8.add(acc, lagrangeWithShare)
                }, F_Base8.zero)

                return mulPointEscalar(C1, dkgVotingPrivKeyShare)
            })

            const sC1 = partialDecryptions.reduce(addPoint, PointZero)
            assert(inCurve(sC1))

            assert.deepEqual(sC1, mulPointEscalar(C1, votingPrivKey))

            const decryptedCasts = decryptResults(sC1, C2, VOTERS, OPTIONS)
            assert.deepEqual(decryptedCasts, casts)
    })
});