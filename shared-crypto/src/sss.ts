import { ZFieldElement } from "shared-crypto";
import * as F_Base8 from "./FBase8";
import assert from "node:assert";
import _ from "lodash";
import { SNARK_FIELD_SIZE, SQRT_P } from "./babyjub";

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

export const recoverZ = (shares: { y: bigint, x: number }[], sharesSize: number, threshold: number): bigint => {
    if (threshold > sharesSize) {
        throw new Error(`threshold ${threshold} should be less than sharesSize ${sharesSize}`)
    }

    return shares.reduce((acc, share) => {
        const lagrangeBasis = LagrangeCoefficient(share.x, shares.map(s => s.x))
        const lagrangeWithShare = F_Base8.mul(lagrangeBasis, share.y)
        return F_Base8.add(acc, lagrangeWithShare)
    }, F_Base8.zero)
}

export const generateSharesZ = (polynomial: ZFieldElement[], sharesSize: number): { x: number, y: ZFieldElement }[] => {
    return Array.from({ length: sharesSize }, (_, i) => {
        const x = i + 1;
        return { x, y: evalPolynomialZ(polynomial, F_Base8.e(x)) }
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
    // console.log(`eval[0] = ${result}`)
    for (let j = 1; j < coefficients.length; j++) {
        const exp = F_Base8.exp(x, j)
        // console.log(`exp[${j}] = ${F_Base8.toBigint(exp)}`)
        // console.log(`coeff[${j}] = ${F_Base8.toBigint(coefficients[j])}`)

        // console.log(`coeff[${j}] = ${coefficients[j]}`)
        // console.log(`exp[${j}] = ${exp}`)
        const mul = F_Base8.mul_safe(coefficients[j], exp)
        // console.log(`mul[${j}] = ${F_Base8.toBigint(mul)}`)
        // assert.deepEqual(F_Base8.mul(coefficients[j], exp), mul) // TODO this has to equal
        // result = F_Base8.add(result, mul)
        result = F_Base8.add_safe(result, mul)
        // console.log(`eval[${j}] = ${result}`)
    }
    return result;
}
