/// <reference path='../src/types.d.ts'/>

import assert from 'assert';
import { BabyJubPoint, addPoint, decryptBallot, decryptResults, encryptBallot, formatPrivKeyForBabyJub, genPrivKey, genPubKey, genRandomSalt, mulPointEscalar } from '../src';

describe('Ballot and homomorphically aggregated results encryption and decryption', () => {

    it("should encrypt and decrypt single votes", async () => {
        const VOTERS = 10 as const;
        const OPTIONS = 3 as const;
        let casts = Array.from({ length: OPTIONS }, (_, i) => 0);
        for (let voter = 0; voter < VOTERS; voter++) {
            const cast = (voter % OPTIONS) + 1
            casts[cast - 1] += 1

            const r = genRandomSalt()

            const votingPrivKey = formatPrivKeyForBabyJub(genPrivKey())
            const votingPubKey = genPubKey(votingPrivKey)

            const [C1, C2] = encryptBallot(votingPubKey, BigInt(cast), r, VOTERS, OPTIONS)
            const decryptedCast = decryptBallot(C1, C2, votingPrivKey, VOTERS, OPTIONS)

            assert.strictEqual(decryptedCast, BigInt(cast))
        }
    })

    it("should encrypt and decrypt aggregated encrypted votes", async () => {
        const VOTERS = 10 as const;
        const OPTIONS = 4 as const;
        let casts = Array.from({ length: OPTIONS }, (_, i) => 0n);

        const votingPrivKey = formatPrivKeyForBabyJub(genPrivKey())
        const votingPubKey = genPubKey(votingPrivKey)

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

        const C1r = mulPointEscalar(C1, votingPrivKey)
        const decryptedCasts = decryptResults(C1r, C2, VOTERS, OPTIONS)
        assert.deepEqual(decryptedCasts, casts)
    })

})