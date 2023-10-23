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

export const decryptResults = (c1r: BabyJubPoint, c2: BabyJubPoint, voters: number, options: number): bigint[] => {
    const c1rXNeg = F.neg(c1r[0])
    const mG = addPoint(c2, [c1rXNeg, c1r[1]])
    return exhoustiveSearch(mG, voters, options)
}

const exhoustiveSearchOld = (M: BabyJubPoint, voters: number, options: number): [bigint, bigint, bigint, bigint] => {
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

const exhoustiveSearch= (M: BabyJubPoint, voters: number, options: number): bigint[] => {
    const mBits = findMbits(voters);
    const optionBases: bigint[] = Array.from({ length: options }, (_, idx) => {
        const exponent = BigInt(idx) * mBits;
        return (2n ** exponent) % SNARK_FIELD_SIZE;
    });

    const start = Date.now();

    const search = (): bigint[] => {
    switch (options) {
        case 2:
            return baseSearch2(M, voters, optionBases);
        case 3:
            return baseSearch3(M, voters, optionBases);
        case 4:
            return baseSearch4(M, voters, optionBases);
        case 5:
            return baseSearch5(M, voters, optionBases);
        case 6:
            return baseSearch6(M, voters, optionBases);
        case 7:
            return baseSearch7(M, voters, optionBases);
        case 8:
            return baseSearch8(M, voters, optionBases);
        case 9:
            return baseSearch9(M, voters, optionBases);
        case 10:
            return baseSearch10(M, voters, optionBases);
        default:
            throw Error("Invalid number of options");
    }
}

    const result = search();
    const end = Date.now();
    const time = end - start;
    console.log(`${voters}, ${options}, ${time}`);
    return result;
}

const isDecodedMatch = (sum: bigint, M: BabyJubPoint): boolean => {
    const decoded = mulPointEscalar(Base8, sum);
    return F.toBigint(decoded[0]) === F.toBigint(M[0]) && F.toBigint(decoded[1]) === F.toBigint(M[1]);
}

const baseSearch2 = (M: BabyJubPoint, voters: number, optionValues: bigint[]): bigint[] => {
    const votersBigint = BigInt(voters);
    for (let x_1 = 0n; x_1 <= votersBigint; x_1++) {
        for (let x_2 = 0n; x_2 <= votersBigint - x_1; x_2++) {
            const sum = x_1 * optionValues[0] + x_2 * optionValues[1];
            if (isDecodedMatch(sum, M)) {
                return [x_1, x_2];
            }
        }
    }
    throw Error("Could not decrypt results");
}

const baseSearch3 = (M: BabyJubPoint, voters: number, optionValues: bigint[]): bigint[] => {
    const votersBigint = BigInt(voters);
    for (let x_1 = 0n; x_1 <= votersBigint; x_1++) {
        for (let x_2 = 0n; x_2 <= votersBigint - x_1; x_2++) {
            for (let x_3 = 0n; x_3 <= votersBigint - x_1 - x_2; x_3++) {
                const sum = x_1 * optionValues[0] + x_2 * optionValues[1] + x_3 * optionValues[2];
                if (isDecodedMatch(sum, M)) {
                    return [x_1, x_2, x_3];
                }
            }
        }
    }
    throw Error("Could not decrypt results");
}

const baseSearch4 = (M: BabyJubPoint, voters: number, optionValues: bigint[]): bigint[] => {
    const votersBigint = BigInt(voters);
    for (let x_1 = 0n; x_1 <= votersBigint; x_1++) {
        for (let x_2 = 0n; x_2 <= votersBigint - x_1; x_2++) {
            for (let x_3 = 0n; x_3 <= votersBigint - x_1 - x_2; x_3++) {
                for (let x_4 = 0n; x_4 <= votersBigint - x_1 - x_2 - x_3; x_4++) {
                    const sum = x_1 * optionValues[0] + x_2 * optionValues[1] + x_3 * optionValues[2] + x_4 * optionValues[3];
                    if (isDecodedMatch(sum, M)) {
                        return [x_1, x_2, x_3, x_4];
                    }
                }
            }
        }
    }
    throw Error("Could not decrypt results");
}

const baseSearch5 = (M: BabyJubPoint, voters: number, optionValues: bigint[]): bigint[] => {
    const votersBigint = BigInt(voters);
    for (let x_1 = 0n; x_1 <= votersBigint; x_1++) {
        for (let x_2 = 0n; x_2 <= votersBigint - x_1; x_2++) {
            for (let x_3 = 0n; x_3 <= votersBigint - x_1 - x_2; x_3++) {
                for (let x_4 = 0n; x_4 <= votersBigint - x_1 - x_2 - x_3; x_4++) {
                    for (let x_5 = 0n; x_5 <= votersBigint - x_1 - x_2 - x_3 - x_4; x_5++) {
                        const sum = x_1 * optionValues[0] + x_2 * optionValues[1] + x_3 * optionValues[2] + x_4 * optionValues[3] + x_5 * optionValues[4];
                        if (isDecodedMatch(sum, M)) {
                            return [x_1, x_2, x_3, x_4, x_5];
                        }
                    }
                }
            }
        }
    }
    throw Error("Could not decrypt results");
}
const baseSearch6 = (M: BabyJubPoint, voters: number, optionValues: bigint[]): bigint[] => {
    const votersBigint = BigInt(voters);
    for (let x_1 = 0n; x_1 <= votersBigint; x_1++) {
        for (let x_2 = 0n; x_2 <= votersBigint - x_1; x_2++) {
            for (let x_3 = 0n; x_3 <= votersBigint - x_1 - x_2; x_3++) {
                for (let x_4 = 0n; x_4 <= votersBigint - x_1 - x_2 - x_3; x_4++) {
                    for (let x_5 = 0n; x_5 <= votersBigint - x_1 - x_2 - x_3 - x_4; x_5++) {
                        for (let x_6 = 0n; x_6 <= votersBigint - x_1 - x_2 - x_3 - x_4 - x_5; x_6++) {
                            const sum = x_1 * optionValues[0] + x_2 * optionValues[1] + x_3 * optionValues[2] + x_4 * optionValues[3] + x_5 * optionValues[4] + x_6 * optionValues[5];
                            if (isDecodedMatch(sum, M)) {
                                return [x_1, x_2, x_3, x_4, x_5, x_6];
                            }
                        }
                    }
                }
            }
        }
    }
    throw Error("Could not decrypt results");
}

const baseSearch7 = (M: BabyJubPoint, voters: number, optionValues: bigint[]): bigint[] => {
    const votersBigint = BigInt(voters);
    for (let x_1 = 0n; x_1 <= votersBigint; x_1++) {
        for (let x_2 = 0n; x_2 <= votersBigint - x_1; x_2++) {
            for (let x_3 = 0n; x_3 <= votersBigint - x_1 - x_2; x_3++) {
                for (let x_4 = 0n; x_4 <= votersBigint - x_1 - x_2 - x_3; x_4++) {
                    for (let x_5 = 0n; x_5 <= votersBigint - x_1 - x_2 - x_3 - x_4; x_5++) {
                        for (let x_6 = 0n; x_6 <= votersBigint - x_1 - x_2 - x_3 - x_4 - x_5; x_6++) {
                            for (let x_7 = 0n; x_7 <= votersBigint - x_1 - x_2 - x_3 - x_4 - x_5 - x_6; x_7++) {
                                const sum = x_1 * optionValues[0] + x_2 * optionValues[1] + x_3 * optionValues[2] + x_4 * optionValues[3] + x_5 * optionValues[4] + x_6 * optionValues[5] + x_7 * optionValues[6];
                                if (isDecodedMatch(sum, M)) {
                                    return [x_1, x_2, x_3, x_4, x_5, x_6, x_7];
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    throw Error("Could not decrypt results");
}
const baseSearch8 = (M: BabyJubPoint, voters: number, optionValues: bigint[]): bigint[] => {
    const votersBigint = BigInt(voters);
    for (let x_1 = 0n; x_1 <= votersBigint; x_1++) {
        for (let x_2 = 0n; x_2 <= votersBigint - x_1; x_2++) {
            for (let x_3 = 0n; x_3 <= votersBigint - x_1 - x_2; x_3++) {
                for (let x_4 = 0n; x_4 <= votersBigint - x_1 - x_2 - x_3; x_4++) {
                    for (let x_5 = 0n; x_5 <= votersBigint - x_1 - x_2 - x_3 - x_4; x_5++) {
                        for (let x_6 = 0n; x_6 <= votersBigint - x_1 - x_2 - x_3 - x_4 - x_5; x_6++) {
                            for (let x_7 = 0n; x_7 <= votersBigint - x_1 - x_2 - x_3 - x_4 - x_5 - x_6; x_7++) {
                                for (let x_8 = 0n; x_8 <= votersBigint - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 - x_7; x_8++) {
                                    const sum = x_1 * optionValues[0] + x_2 * optionValues[1] + x_3 * optionValues[2] + x_4 * optionValues[3] + x_5 * optionValues[4] + x_6 * optionValues[5] + x_7 * optionValues[6] + x_8 * optionValues[7];
                                    if (isDecodedMatch(sum, M)) {
                                        return [x_1, x_2, x_3, x_4, x_5, x_6, x_7, x_8];
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    throw Error("Could not decrypt results");
}

const baseSearch9 = (M: BabyJubPoint, voters: number, optionValues: bigint[]): bigint[] => {
    const votersBigint = BigInt(voters);
    for (let x_1 = 0n; x_1 <= votersBigint; x_1++) {
        for (let x_2 = 0n; x_2 <= votersBigint - x_1; x_2++) {
            for (let x_3 = 0n; x_3 <= votersBigint - x_1 - x_2; x_3++) {
                for (let x_4 = 0n; x_4 <= votersBigint - x_1 - x_2 - x_3; x_4++) {
                    for (let x_5 = 0n; x_5 <= votersBigint - x_1 - x_2 - x_3 - x_4; x_5++) {
                        for (let x_6 = 0n; x_6 <= votersBigint - x_1 - x_2 - x_3 - x_4 - x_5; x_6++) {
                            for (let x_7 = 0n; x_7 <= votersBigint - x_1 - x_2 - x_3 - x_4 - x_5 - x_6; x_7++) {
                                for (let x_8 = 0n; x_8 <= votersBigint - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 - x_7; x_8++) {
                                    for (let x_9 = 0n; x_9 <= votersBigint - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 - x_7 - x_8; x_9++) {
                                        const sum = x_1 * optionValues[0] + x_2 * optionValues[1] + x_3 * optionValues[2] + x_4 * optionValues[3] + x_5 * optionValues[4] + x_6 * optionValues[5] + x_7 * optionValues[6] + x_8 * optionValues[7] + x_9 * optionValues[8];
                                        if (isDecodedMatch(sum, M)) {
                                            return [x_1, x_2, x_3, x_4, x_5, x_6, x_7, x_8, x_9];
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    throw Error("Could not decrypt results");
}

const baseSearch10 = (M: BabyJubPoint, voters: number, optionValues: bigint[]): bigint[] => {
    const votersBigint = BigInt(voters);
    for (let x_1 = 0n; x_1 <= votersBigint; x_1++) {
        for (let x_2 = 0n; x_2 <= votersBigint - x_1; x_2++) {
            for (let x_3 = 0n; x_3 <= votersBigint - x_1 - x_2; x_3++) {
                for (let x_4 = 0n; x_4 <= votersBigint - x_1 - x_2 - x_3; x_4++) {
                    for (let x_5 = 0n; x_5 <= votersBigint - x_1 - x_2 - x_3 - x_4; x_5++) {
                        for (let x_6 = 0n; x_6 <= votersBigint - x_1 - x_2 - x_3 - x_4 - x_5; x_6++) {
                            for (let x_7 = 0n; x_7 <= votersBigint - x_1 - x_2 - x_3 - x_4 - x_5 - x_6; x_7++) {
                                for (let x_8 = 0n; x_8 <= votersBigint - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 - x_7; x_8++) {
                                    for (let x_9 = 0n; x_9 <= votersBigint - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 - x_7 - x_8; x_9++) {
                                        for (let x_10 = 0n; x_10 <= votersBigint - x_1 - x_2 - x_3 - x_4 - x_5 - x_6 - x_7 - x_8 - x_9; x_10++) {
                                            const sum = x_1 * optionValues[0] + x_2 * optionValues[1] + x_3 * optionValues[2] + x_4 * optionValues[3] + x_5 * optionValues[4] + x_6 * optionValues[5] + x_7 * optionValues[6] + x_8 * optionValues[7] + x_9 * optionValues[8] + x_10 * optionValues[9];
                                            if (isDecodedMatch(sum, M)) {
                                                return [x_1, x_2, x_3, x_4, x_5, x_6, x_7, x_8, x_9, x_10];
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    throw Error("Could not decrypt results");
}