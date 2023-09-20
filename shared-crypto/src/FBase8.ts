/// <reference path='./types.d.ts'/>
// wrapper around untyped 
// https://github.com/iden3/ffjavascript/blob/master/src/wasm_field1.js


import * as ff from 'ffjavascript';
import { ZFieldElement } from './types';


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

export function sub(a: bigint, b: bigint): bigint {
    return F_Base8.sub(a, b)
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
    return F_Base8.random()
}

export const toBigint = (a: ZFieldElement): bigint => {
    return F_Base8.toObject(a)
}

export const fromBigint = (a: bigint): ZFieldElement => {
    return F_Base8.fromObject(a)
}