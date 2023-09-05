// wrapper around untyped 
// https://github.com/iden3/ffjavascript/blob/master/src/wasm_field1.js

import { babyjub, genRandomBabyJubScalar } from './babyjub';

const F = babyjub.F;

export const zero: Uint8Array = F.zero
export const one: Uint8Array = F.one

export function e(value: bigint | string | number): Uint8Array {
    return F.e(value)
}

export function neg(value: Uint8Array): Uint8Array {
    return F.neg(value)
}

export function sub(a: Uint8Array, b: Uint8Array): Uint8Array {
    return F.sub(a, b)
}

export function eq(a: Uint8Array, b: Uint8Array): boolean {
    return F.eq(a, b)
}

export const getRandomEscalar = (): Uint8Array => {
    const scalar = genRandomBabyJubScalar()
    return F.e(scalar.toString())
}

export const random = (): Uint8Array => {
    return F.random()
}

export const toBigint = (a: Uint8Array): bigint => {
    return F.toObject(a)
}

export const fromBigint = (a: bigint): Uint8Array => {
    return F.fromObject(a)
}