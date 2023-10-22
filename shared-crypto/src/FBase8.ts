/// <reference path='./types.d.ts'/>
// wrapper around untyped 
// https://github.com/iden3/ffjavascript/blob/master/src/wasm_field1.js


import * as ff from 'ffjavascript';
import { ZFieldElement } from './types';
import assert from 'node:assert';
import { SNARK_FIELD_SIZE, SQRT_P } from './babyjub';


export const BABYJUB_BASE8_ORDER: bigint = 2736030358979909402780800718157159386076813972158567259200215660948447373041n
const F_Base8 = new ff.ZqField(BABYJUB_BASE8_ORDER);

export const zero: bigint = F_Base8.zero
export const one: bigint = F_Base8.one

export function e(value: bigint | string | number): bigint {
    return F_Base8.e(value)
}

export function neg(value: bigint): bigint {
    return F_Base8.neg(value)
}

export function add(a: bigint, b: bigint): bigint {
    return F_Base8.add(a, b)
}

export function add_safe(a: bigint, b: bigint): bigint {
    const a_0 = a % SQRT_P;
    const a_1 = a / SQRT_P;
    assert(a == a_0 + (a_1 * SQRT_P), `a_0 + a_1 * SQRT_P must be equal to a: ${a_0} + ${a_1 * SQRT_P} = ${a}`)

    assert(a_0 < SQRT_P, `a_0 must be less than SQRT_P ${SQRT_P}`)
    assert(a_1 < SQRT_P, `a_1 must be less than SQRT_P ${SQRT_P}`)

    const b_0 = b % SQRT_P;
    const b_1 = b / SQRT_P;
    assert(b === b_0 + (b_1 * SQRT_P), `b_0 + b_1 * SQRT_P must be equal to b: ${b_0} + ${b_1 * SQRT_P} = ${b}`)

    assert(b_0 < SQRT_P, `b_0 must be less than SQRT_P ${SQRT_P}`)
    assert(b_1 < SQRT_P, `b_1 must be less than SQRT_P ${SQRT_P}`)

    const sum_0 = (a_0 + b_0) % SNARK_FIELD_SIZE;
    const sum_1 = (a_1 + b_1) % SNARK_FIELD_SIZE;

    const result_p = (sum_0 + sum_1 * SQRT_P) % SNARK_FIELD_SIZE;
    const result_n = result_p % BABYJUB_BASE8_ORDER;
    return result_n;
}

export function sub(a: bigint, b: bigint): bigint {
    return F_Base8.sub(a, b)
}

export function mul_safe(a: bigint, b: bigint): bigint {
    const a_0 = a % SQRT_P;
    const a_1 = a / SQRT_P;
    assert(a == a_0 + (a_1 * SQRT_P), `a_0 + a_1 * SQRT_P must be equal to a: ${a_0} + ${a_1 * SQRT_P} = ${a}`)

    assert(a_0 < SQRT_P, `a_0 must be less than SQRT_P ${SQRT_P}`)
    assert(a_1 < SQRT_P, `a_1 must be less than SQRT_P ${SQRT_P}`)

    const b_0 = b % SQRT_P;
    const b_1 = b / SQRT_P;
    assert(b === b_0 + (b_1 * SQRT_P), `b_0 + b_1 * SQRT_P must be equal to b: ${b_0} + ${b_1 * SQRT_P} = ${b}`)

    assert(b_0 < SQRT_P, `b_0 must be less than SQRT_P ${SQRT_P}`)
    assert(b_1 < SQRT_P, `b_1 must be less than SQRT_P ${SQRT_P}`)

    const mul_in_p = (
        (
            (a_0 * b_0) % SNARK_FIELD_SIZE
            + (a_1 * b_0 * SQRT_P) % SNARK_FIELD_SIZE
            + (a_0 * b_1 * SQRT_P) % SNARK_FIELD_SIZE
            + (a_1 * b_1 * SQRT_P * SQRT_P) % SNARK_FIELD_SIZE
        ) % SNARK_FIELD_SIZE) 
        
    const mul_in_n = mul_in_p % BABYJUB_BASE8_ORDER;
    return mul_in_n
}

export function mul(a: bigint, b: bigint): bigint {
    return F_Base8.mul(a, b)
}

export function exp(a: bigint, b: bigint | number): bigint {
    return F_Base8.exp(a, b)
}

export function inv(a: bigint): bigint {
    return F_Base8.inv(a)
}

export function eq(a: bigint, b: bigint): boolean {
    return F_Base8.eq(a, b)
}

export const random = (): bigint => {
    const rand = F_Base8.random()
    assert(rand < BABYJUB_BASE8_ORDER, `random number must be less than ${BABYJUB_BASE8_ORDER}`)
    return rand
}

export const toBigint = (a: ZFieldElement): bigint => {
    return F_Base8.toObject(a)
}

export const fromBigint = (a: bigint): ZFieldElement => {
    return F_Base8.fromObject(a)
}