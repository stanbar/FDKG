import assert from "node:assert";
import { addPoint, formatPrivKeyForBabyJub, genPrivKey, genPubKey, genRandomSalt, mulPointEscalar } from "./babyjub";
import { decryptResults, encryptBallot } from "./ballot";
import { BabyJubPoint } from "./types";

for (let options = 2; options < 10; options++) {
    for (let voters = 2; voters < 1000; voters++) {
        const VOTERS = voters;
        const OPTIONS = options;
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
    }
}