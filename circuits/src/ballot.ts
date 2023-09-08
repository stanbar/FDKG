import assert from 'node:assert';
import { BabyJubPoint, Base8, SNARK_FIELD_SIZE, addPoint, mulPointEscalar } from './babyjub';
import * as F from './F';

/*
    We use ballot encoding as defined by Baudron et al. Practical multi-candidate election system
    Suppose that we have n voters, choose m so that m is the smallest integer such that 2^m > n.
 */
function findMbits(voters: number): bigint {
    const n = voters
    let m = 0n
    let val = 1n
    while (val <= n) {
        val *= 2n
        m += 1n
    }
    return m
}

export const encodeBallot = (votingPubKey: BabyJubPoint, cast: bigint, r: bigint, voters: number, options: number): BabyJubPoint => {
    assert(1n <= cast);
    assert(cast <= BigInt(options));

    const mBits = findMbits(voters)

    const exponent = ((cast - 1n) * mBits)
    const message = (2n ** exponent) % SNARK_FIELD_SIZE

    const mG = mulPointEscalar(Base8, message)
    const rP = mulPointEscalar(votingPubKey, r)
    const c2 = addPoint(mG, rP)
    return c2
}

export const decryptBallot = (c1: BabyJubPoint, c2: BabyJubPoint, privKey: bigint, voters: number, options: number): bigint => {
    const mBits = findMbits(voters)
    const c1r = mulPointEscalar(c1, privKey)
    const c1rXNeg = F.neg(c1r[0])
    const mG = addPoint(c2, [c1rXNeg, c1r[1]])
    let x = 1n
    while (x <= options) {
        const exponent = ((x - 1n) * mBits)
        const message = (2n ** exponent) % SNARK_FIELD_SIZE

        const decoded = mulPointEscalar(Base8, message)
        if (F.toBigint(decoded[0]) === F.toBigint(mG[0]) && F.toBigint(decoded[1]) === F.toBigint(mG[1])) {
            return x
        }
        x += 1n
    }
    throw Error("Could not decrypt ballot")
}
