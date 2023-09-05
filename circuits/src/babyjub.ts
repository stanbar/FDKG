import * as circomlibjs from 'circomlibjs';
import assert from 'node:assert';
import * as crypto from 'crypto'
import createBlakeHash from 'blake-hash'

// https://github.com/iden3/circomlibjs/blob/main/src/babyjub.js
export const babyjub = await circomlibjs.buildBabyjub()
const eddsa = await circomlibjs.buildEddsa()

import * as ff from 'ffjavascript';

export type BabyJubPoint = [Uint8Array, Uint8Array]

export const Generator: BabyJubPoint = babyjub.Generator
export const Base8: BabyJubPoint = babyjub.Base8

export type PrivKey = bigint
export type PubKey = [Uint8Array, Uint8Array]

/*
 * A private key and a public key
 */
export interface Keypair {
    privKey: PrivKey;
    pubKey: PubKey;
}

// The BN254 group order p
export const SNARK_FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export function mulPointEscalar(p: BabyJubPoint, scalar: bigint|number): BabyJubPoint {
    return babyjub.mulPointEscalar(p, scalar)
}

export function inCurve(p: BabyJubPoint): boolean {
    return babyjub.inCurve(p)
}

export function inSubgroup(p: BabyJubPoint): boolean {
    return babyjub.inSubgroup(p)
}

export function addPoint(p1: BabyJubPoint, p2: BabyJubPoint): BabyJubPoint {
    return babyjub.addPoint(p1, p2)
}


/*
 * An internal function which formats a random private key to be compatible
 * with the BabyJub curve. This is the format which should be passed into the
 * PubKey and other circuits.
 */
export const formatPrivKeyForBabyJub = (privKey: PrivKey): bigint => {
    const sBuff = eddsa.pruneBuffer(
        createBlakeHash("blake512").update(
            Buffer.from(privKey.toString(16), 'hex'),
        ).digest().slice(0, 32)
    )
    const s = ff.utils.leBuff2int(sBuff)
    return ff.Scalar.shr(s, 3)
}

/*
 * Returns a BabyJub-compatible random value. We create it by first generating
 * a random value (initially 256 bits large) modulo the snark field size as
 * described in EIP197. This results in a key size of roughly 253 bits and no
 * more than 254 bits. To prevent modulo bias, we then use this efficient
 * algorithm:
 * http://cvsweb.openbsd.org/cgi-bin/cvsweb/~checkout~/src/lib/libc/crypt/arc4random_uniform.c
 * @return A BabyJub-compatible random value.
 */
export const genRandomBabyJubScalar = (): bigint => {

    // Prevent modulo bias
    //const lim = BigInt('0x10000000000000000000000000000000000000000000000000000000000000000')
    //const min = (lim - SNARK_FIELD_SIZE) % SNARK_FIELD_SIZE
    const min = BigInt('6350874878119819312338956282401532410528162663560392320966563075034087161851')

    let rand
    while (true) {
        rand = BigInt('0x' + crypto.randomBytes(32).toString('hex'))

        if (rand >= min) {
            break
        }
    }

    const privKey: bigint = rand % SNARK_FIELD_SIZE
    assert(privKey < SNARK_FIELD_SIZE)

    return privKey
}

/*
 * @return A BabyJub-compatible private key.
 */
export const genPrivKey = (): PrivKey => {

    return formatPrivKeyForBabyJub(genRandomBabyJubScalar())
}

/*
 * @return A BabyJub-compatible salt.
 */
export const genRandomSalt = (): PrivKey => {

    return formatPrivKeyForBabyJub(genRandomBabyJubScalar())
}

/*
 * @param privKey A private key generated using genPrivKey()
 * @return A public key associated with the private key
 */
export const genPubKey = (privKey: PrivKey): PubKey => {
    // Check whether privKey is a field element
    privKey = BigInt(privKey.toString())
    assert(privKey < SNARK_FIELD_SIZE)
    const publicKey = babyjub.mulPointEscalar(babyjub.Base8, privKey)
    assert(babyjub.inCurve(publicKey));
    return publicKey
}

export const genKeypair = (): Keypair => {
    const privKey = genPrivKey()
    const pubKey = genPubKey(privKey)

    const Keypair: Keypair = { privKey, pubKey }

    return Keypair
}