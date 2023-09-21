import { Base8, F, BabyJubPoint, inCurve, addPoint, decryptResults, encryptBallot, genRandomSalt, mulPointEscalar  } from "shared-crypto";
import { evalPolynomialZ, generateSharesZ, interpolateOneZ, randomPolynomialZ, recoverZ } from "../src/sss";
import assert from "node:assert";
import { PointZero } from "../src/F";
import * as F_Base8 from "../src/FBase8";

describe('Shamir Secret Sharing', () => {
    it("should split and recover", async () => {
        for (let i = 1; i < 10; i++) {
            const secret = F_Base8.e(i)
            const THRESHOLD = i;
            const SHARES_SIZE = i;
            const poly = randomPolynomialZ(THRESHOLD, secret)
            const shares = generateSharesZ(poly, SHARES_SIZE)
            const recovered = recoverZ(shares, SHARES_SIZE)
            assert.equal(secret, recovered)
            assert.deepEqual(secret, recovered)
        }
    })

    it("adding scalars and multplying by point", async () => {
        const factor1 = F_Base8.mul(F_Base8.e(3), interpolateOneZ(1, 2))
        const factor2 = F_Base8.mul(F_Base8.e(4), interpolateOneZ(2, 2))
        assert.deepEqual(F_Base8.add(factor1, factor2), F_Base8.e(2))

        const g1 = mulPointEscalar(Base8, F_Base8.toBigint(factor1))
        const g2 = mulPointEscalar(Base8, F_Base8.toBigint(factor2))
        assert.deepEqual(addPoint(g1, g2), mulPointEscalar(Base8, 2))
    })
    it("encrypt one dealer many votes and two dkgs", async () => {
        const VOTERS = 10 as const;
        const OPTIONS = 4 as const;
        const THRESHOLD = 3;
        const SHARES_SIZE = 3;

        assert(SHARES_SIZE >= THRESHOLD, `SHARES_SIZE ${SHARES_SIZE} should be equal or greater than THRESHOLD ${THRESHOLD}`)

        let casts = Array.from({ length: OPTIONS }, (_, i) => 0n);

        const poly1 = randomPolynomialZ(THRESHOLD)
        const secret1 = evalPolynomialZ(poly1, 0n)
        const shares1 = generateSharesZ(poly1, SHARES_SIZE)

        assert.deepEqual(recoverZ(shares1, SHARES_SIZE), secret1)
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

            const dkgVotingPrivKeyShare = sharesForDkgParty.reduce((acc, share) => {
                const lagrangeBasis = interpolateOneZ(dkgPartyIndex + 1, SHARES_SIZE)
                const lagrangeWithShare = F_Base8.mul(lagrangeBasis, share)
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
        const THRESHOLD = 3;
        const SHARES_SIZE = 4;

        assert(SHARES_SIZE >= THRESHOLD, `SHARES_SIZE ${SHARES_SIZE} should be equal or greater than THRESHOLD ${THRESHOLD}`)

        let casts = Array.from({ length: OPTIONS }, (_, i) => 0n);

        const poly1 = randomPolynomialZ(THRESHOLD)
        const secret1 = evalPolynomialZ(poly1, 0n)
        const shares1 = generateSharesZ(poly1, SHARES_SIZE)

        assert.deepEqual(recoverZ(shares1, SHARES_SIZE), secret1)

        const poly2 = randomPolynomialZ(THRESHOLD)
        const secret2 = evalPolynomialZ(poly2, 0n)
        const shares2 = generateSharesZ(poly2, SHARES_SIZE)

        assert.deepEqual(recoverZ(shares2, SHARES_SIZE), secret2)

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
                const lagrangeBasis = interpolateOneZ(dkgPartyIndex + 1, SHARES_SIZE)
                const lagrangeWithShare = F_Base8.mul(lagrangeBasis, share)
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