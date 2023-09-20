/// <reference path='./types.d.ts'/>
// wrapper around untyped 
// https://github.com/iden3/ffjavascript/blob/master/src/wasm_field1.js

import { babyjub } from './babyjub';
import { BabyJubPoint, FFieldElement } from './types';

const F = babyjub.F;

export const PointZero: BabyJubPoint = [F.zero, F.one];
export const zero: FFieldElement = F.zero
export const one: FFieldElement = F.one

export function e(value: bigint | string | number): FFieldElement {
    return F.e(value)
}

export function neg(value: FFieldElement): FFieldElement {
    return F.neg(value)
}

export function add(a: FFieldElement, b: FFieldElement): FFieldElement {
    return F.add(a, b)
}

export function sub(a: FFieldElement|bigint, b: FFieldElement|bigint): FFieldElement {
    return F.sub(a, b)
}

export function mul(a: FFieldElement, b: FFieldElement | number): FFieldElement {
    return F.mul(a, b)
}

export function exp(a: FFieldElement, b: FFieldElement | number): FFieldElement {
    return F.exp(a, b)
}

export function inv(a: FFieldElement): FFieldElement {
    return F.inv(a)
}

export function eq(a: FFieldElement, b: FFieldElement): boolean {
    return F.eq(a, b)
}


export const random = (): FFieldElement => {
    return F.random()
}

export const toBigint = (a: FFieldElement): bigint => {
    return F.toObject(a)
}

export const fromBigint = (a: bigint): FFieldElement => {
    return F.fromObject(a)
}