import { F, FFieldElement, PrivKey, ZFieldElement, genRandomSalt } from "shared-crypto";
import * as F_Base8 from "./FBase8";
import assert from "node:assert";
import _ from "lodash";

// in goldwasserLectureNotesCryptography1996 the formula for Lagrange coefficients is:
// \lambda_{Q,i} = \Prod_{j \in Q, j \neq i} \frac{j}{j-i}
export const LagrangeCoefficient = (i: number, Q: number[]): bigint => {
    let prod = F_Base8.one;
    for (let j = 0; j < Q.length; j++) {
        if (i !== Q[j]) {
            const nominator = BigInt(Q[j])
            const denom = F_Base8.sub(nominator, BigInt(i));
            const denominator = F_Base8.inv(denom);

            if (denominator === null || denominator === F_Base8.zero) {
                throw new Error(`could not find inverse of denominator ${denominator}`);
            }

            const e = F_Base8.mul(nominator, denominator)
            prod = F_Base8.mul(prod, e)
        }
    }
    return prod
}

export const recoverZ = (shares: {y: bigint, x: number }[], sharesSize: number, threshold: number): bigint => {
    if (threshold > sharesSize) {
        throw new Error(`threshold ${threshold} should be less than sharesSize ${sharesSize}`)
    }

    const sum = shares.reduce((acc, share, i) => {
        const lagrangeBasis = LagrangeCoefficient(share.x, shares.map(s => s.x))
        const lagrangeWithShare = F_Base8.mul(lagrangeBasis, share.y)
        return F_Base8.add(acc, lagrangeWithShare)
    }, F_Base8.zero)

    return sum
}

export const generateSharesZ = (polynomial: ZFieldElement[], sharesSize: number): { x: number, y: ZFieldElement}[] => {
    return Array.from({ length: sharesSize }, (_, i) => {
        const x = i + 1;
        return { x , y: evalPolynomialZ(polynomial, F_Base8.e(x))}
    })
}

export const randomPolynomialZ = (threshold: number, secret?: ZFieldElement): ZFieldElement[] => {
    const coefficients = Array.from({ length: threshold }, (_, i) => F_Base8.random());
    if (secret) {
        assert(secret < F_Base8.BABYJUB_BASE8_ORDER, "secret must be less than field size")
        coefficients[0] = secret;
    }
    return coefficients;
}

export const evalPolynomialZ = (coefficients: ZFieldElement[], x: ZFieldElement): ZFieldElement => {
    let result = coefficients[0];
    for (let i = 1; i < coefficients.length; i++) {
        // result = (result + coefficients[i] * (x ** BigInt(i))) % SNARK_FIELD_SIZE;
        const exp = F_Base8.exp(x, i)
        const mul = F_Base8.mul(coefficients[i], exp)
        result = F_Base8.add(result, mul)
    }
    return result; // F.toBigint(result)
}

// export const randomPolynomial = (threshold: number, secret?: PrivKey): bigint[] => {
//     const coefficients = Array.from({ length: threshold }, (_, i) => genRandomSalt());
//     if (secret) coefficients[0] = secret;
//     return coefficients;
// }

// export const generateShares = (polynomial: bigint[], sharesSize: number): bigint[] => {
//     return Array.from({ length: sharesSize }, (_, i) => {
//         return evalPolynomial(polynomial, BigInt(i + 1))
//     })
// }

// export const recover = (shares: bigint[], sharesSize: number): bigint => {
//     let sum = 0n
//     for (let i = 1; i <= sharesSize; i++) {
//         const lagrangeBasis = interpolateOneBigInt(i, sharesSize)
//         const share = shares[i - 1]
//         sum += (lagrangeBasis * share) % SNARK_FIELD_SIZE
//     }
//     return sum % SNARK_FIELD_SIZE
// }



// export const evalPolynomial = (coefficients: bigint[], x: bigint): bigint => {
//     let result = coefficients[0];
//     for (let i = 1; i < coefficients.length; i++) {
//         const exp = x ** BigInt(i)
//         result = (result + (coefficients[i] * exp) % SNARK_FIELD_SIZE) % SNARK_FIELD_SIZE
//     }
//     return result;
// }

// // Extended Euclidean Algorithm
// const extendedGCD = (a: bigint, b: bigint): [bigint, bigint, bigint] => {
//     if (a === 0n) {
//         return [b, 0n, 1n];
//     }
//     let [gcd, x1, y1] = extendedGCD(b % a, a);
//     let x = y1 - (b / a) * x1;
//     let y = x1;
//     return [gcd, x, y];
// };

// // Function to calculate modular inverse using Extended Euclidean Algorithm
// const modInverse = (a: bigint, m: bigint): bigint => {
//     let [gcd, x, _] = extendedGCD(a, m);
//     if (gcd !== BigInt(1)) {
//         throw new Error(`Modular inverse does not exist for ${a} mod ${m}`);
//     }
//     return (x % m + m) % m;
// };

// export const interpolateOneBigInt = (shareIndex: number, sharesSize: number): bigint => {
//     const i = BigInt(shareIndex);
//     const n = BigInt(sharesSize)
//     let prod = 1n;
//     for (let j = 1n; j <= n; j++) {
//         if (i !== j) {
//             const sj = BigInt(j);
//             const si = BigInt(shareIndex);
//             let denominator: bigint = (sj - si + SNARK_FIELD_SIZE) % SNARK_FIELD_SIZE; // Adding fieldOrder to ensure the result is positive

//             // Calculate modular inverse of the denominator
//             try {
//                 denominator = modInverse(denominator, SNARK_FIELD_SIZE);
//             } catch (e) {
//                 throw new Error(`Could not find inverse of denominator ${denominator}`);
//             }

//             const e = (sj * denominator) % SNARK_FIELD_SIZE;
//             prod = (prod * e) % SNARK_FIELD_SIZE;
//         }
//     }
//     return prod;
// };


export const interpolateOneF = (shareIndex: number, sharesSize: number): FFieldElement => {
    let prod = F.one;
    for (let j = 1; j <= sharesSize; j++) {
        if (shareIndex !== j) {
            const sj = F.e(j);
            const si = F.e(shareIndex);
            let denominator = F.sub(sj, si);
            denominator = F.inv(denominator)

            if (denominator === null || denominator === F.e("0")) {
                throw new Error(`could not find inverse of denominator ${denominator}`);
            }

            const e = F.mul(sj, denominator)
            prod = F.mul(prod, e)
        }
    }
    return prod
}
