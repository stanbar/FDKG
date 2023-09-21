import assert from 'node:assert';
import { Base8, SNARK_FIELD_SIZE, addPoint, mulPointEscalar } from './babyjub';
import * as F from './F';
import { BabyJubPoint } from './types';

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

const encodeBallotCast = (votingPubKey: BabyJubPoint, cast: bigint, r: bigint, voters: number, options: number): BabyJubPoint => {
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
export const encryptBallot = (votingPubKey: BabyJubPoint, cast: bigint, r: bigint, voters: number, options: number): [BabyJubPoint, BabyJubPoint] => {
    const C1: BabyJubPoint = mulPointEscalar(Base8, r)
    const C2: BabyJubPoint = encodeBallotCast(votingPubKey, cast, r, voters, options)
    return [C1, C2]
}

export const encryptMessage = (votingPubKey: BabyJubPoint, cast: bigint, r: bigint, voters: number, options: number): [BabyJubPoint, BabyJubPoint] => {
    const C1: BabyJubPoint = mulPointEscalar(Base8, r)
    const mG = mulPointEscalar(Base8, cast)
    const rP = mulPointEscalar(votingPubKey, r)
    const C2: BabyJubPoint = addPoint(mG, rP)
    return [C1, C2]
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

export const decryptBallotMpc = (c1r: BabyJubPoint, c2: BabyJubPoint, voters: number, options: number): bigint => {
    const mBits = findMbits(voters)
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

export const decryptResults = (c1r: BabyJubPoint, c2: BabyJubPoint, voters: number, options: number): [bigint, bigint, bigint, bigint] => {
    const c1rXNeg = F.neg(c1r[0])
    const mG = addPoint(c2, [c1rXNeg, c1r[1]])
    return exhoustiveSearch(mG, voters, options)
}

const exhoustiveSearch = (M: BabyJubPoint, voters: number, options: number): [bigint, bigint, bigint, bigint] => {
    const mBits = findMbits(voters)
    let rounds = 0n
    const votersBigint = BigInt(voters)
    // x_1 * 2^((option_1-1) * mBits)
    const exponentForOptionOne = ((1n - 1n) * mBits)
    const optionOne = (2n ** exponentForOptionOne) % SNARK_FIELD_SIZE
    // x_1 * 2^((option_1-1) * mBits)
    const exponentForOptionTwo = ((2n - 1n) * mBits)
    const optionTwo = (2n ** exponentForOptionTwo) % SNARK_FIELD_SIZE
    // x_1 * 2^((option_1-1) * mBits)
    const exponentForOptionThree = ((3n - 1n) * mBits)
    const optionThree = (2n ** exponentForOptionThree) % SNARK_FIELD_SIZE
    // x_1 * 2^((option_1-1) * mBits)
    const exponentForOptionFour = ((4n - 1n) * mBits)
    const optionFour = (2n ** exponentForOptionFour) % SNARK_FIELD_SIZE
    for (let x_1 = 0n; x_1 <= voters; x_1++) {
        for (let x_2 = 0n; x_2 <= votersBigint - x_1; x_2++) {
            for (let x_3 = 0n; x_3 <= votersBigint - x_1 - x_2; x_3++) {
                for (let x_4 = 0n; x_4 <= votersBigint - x_1 - x_2 - x_3; x_4++) {
                    const sum = x_1 * optionOne + x_2 * optionTwo + x_3 * optionThree + x_4 * optionFour
                    rounds += 1n
                    const decoded = mulPointEscalar(Base8, sum)
                    if (F.toBigint(decoded[0]) === F.toBigint(M[0]) && F.toBigint(decoded[1]) === F.toBigint(M[1])) {
                        console.log(`✅ Successfully decrypted results after ${rounds} rounds, ${[x_1, x_2, x_3, x_4]}`)
                        return [x_1, x_2, x_3, x_4]
                    }
                }
            }
        }
    }
    throw Error("Could not decrypt results")
}