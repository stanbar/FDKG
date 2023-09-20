import assert from 'node:assert';
import * as F from './F'
import { PubKey, SNARK_FIELD_SIZE, genRandomSalt, mulPointEscalar, Base8, addPoint, genPubKey, inSubgroup  } from './babyjub';
import { BabyJubPoint, FFieldElement } from './types';

export interface Message {
    point: BabyJubPoint,
    xIncrement: FFieldElement,
}

export interface ElGamalCiphertext {
    c1: BabyJubPoint;
    c2: BabyJubPoint;
    xIncrement: FFieldElement;
}

/*
 * Encrypts a plaintext such that only the owner of the specified public key
 * may decrypt it.
 * @param plaintext An arbitrary value which must be within the BabyJub field
 * @param pubKey The recepient's public key
 * @param randomVal A random value y used along with the private key to
 *                  generate the ciphertext
 */
export const encryptShare = (
    plaintext: bigint,
    pubKey: PubKey,
    randomVal: bigint = genRandomSalt(),
    randomVal2: bigint = genRandomSalt(),
): ElGamalCiphertext => {
    const message: Message = scalarToPoint(plaintext, randomVal2)

    const c1Point = mulPointEscalar(Base8, randomVal)

    const pky = mulPointEscalar(pubKey, randomVal)
    const c2Point = addPoint(message.point, pky)

    return {
        c1: c1Point,
        c2: c2Point,
        xIncrement: message.xIncrement,
    }
}

/*
 * Converts an arbitrary BigInt, which must be less than the BabyJub field
 * size, into a Message. Each Message has a BabyJub curve point, and an
 * x-increment. 
 *
 * @param original The value to encode. It must be less than the BabyJub field
 *                 size.
 */
export const scalarToPoint = (
    original: bigint,
    randomVal: bigint = genRandomSalt(),
): Message => {
    const randomPoint = genPubKey(randomVal)

    assert(inSubgroup(randomPoint))

    const xIncrement = F.sub(randomPoint[0], F.e(original.toString()))

    return { point: randomPoint, xIncrement }
}


/*
 * Decrypts a ciphertext using a private key.
 * @param privKey The private key
 * @param ciphertext The ciphertext to decrypt
 */
export const decryptShare = (privKey: bigint, ciphertext: ElGamalCiphertext): bigint => {
    const c1x: BabyJubPoint = mulPointEscalar(
        ciphertext.c1,
        privKey
    )

    const c1xInverse: BabyJubPoint = [
        F.neg(c1x[0]),
        c1x[1],
    ]

    const decrypted: BabyJubPoint = addPoint(
        c1xInverse,
        ciphertext.c2
    )

    return pointToScalar(
        {
            point: decrypted,
            xIncrement: ciphertext.xIncrement,
        }
    )
}


/*
 * Converts a Message into the original value.
 * The original value is the x-value of the BabyJub point minus the
 * x-increment.
 * @param message The message to convert.
 */
export const pointToScalar = (message: Message): bigint => {
    const decoded = F.toBigint(F.sub(message.point[0], message.xIncrement))

    assert(decoded >= BigInt(0))
    assert(decoded < SNARK_FIELD_SIZE)

    return decoded
}