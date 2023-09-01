import assert from 'node:assert';

import * as circomlibjs from 'circomlibjs';

import {
    genPubKey,
    genPrivKey,
    formatPrivKeyForBabyJub,
    PubKey,
    PrivKey,
    genRandomSalt,
    SNARK_FIELD_SIZE,
} from './maci-crypto.js'

const babyJub = await circomlibjs.buildBabyjub()
const F = babyJub.F

type BabyJubPoint = [Uint8Array, Uint8Array]

interface Message {
    point: BabyJubPoint,
    xIncrement: Uint8Array,
}

interface ElGamalCiphertext {
    c1: BabyJubPoint;
    c2: BabyJubPoint;
    xIncrement: Uint8Array;
}

/*
 * Converts an arbitrary BigInt, which must be less than the BabyJub field
 * size, into a Message. Each Message has a BabyJub curve point, and an
 * x-increment. 
 *
 * @param original The value to encode. It must be less than the BabyJub field
 *                 size.
 */
const encodeToMessage = async (
    original: bigint
): Promise<Message> => {
    const randomVal = genPrivKey()
    const randomPoint = genPubKey(randomVal)

    assert(babyJub.inSubgroup(randomPoint))

    const xIncrement = F.sub(randomPoint[0], original)

    assert(F.geq(xIncrement, BigInt(0)), `xIncrement: ${xIncrement} is negative`)
    assert(F.le(xIncrement, SNARK_FIELD_SIZE), `xIncrement: ${xIncrement} is too large`)

    const point: BabyJubPoint = randomPoint

    return { point, xIncrement }
}

/*
 * Converts a Message into the original value.
 * The original value is the x-value of the BabyJub point minus the
 * x-increment.
 * @param message The message to convert.
 */
const decodeMessage = async (message: Message): Promise<bigint> => {
    const decoded = buffer2BigInt(F.sub(message.point[0], message.xIncrement))
    
    assert(decoded >= BigInt(0))
    assert(decoded < babyJub.p, `decoded: ${decoded}, p: ${babyJub.p} is to large`)

    return decoded
}

/*
 * Encrypts a plaintext such that only the owner of the specified public key
 * may decrypt it.
 * @param plaintext An arbitrary value which must be within the BabyJub field
 * @param pubKey The recepient's public key
 * @param randomVal A random value y used along with the private key to
 *                  generate the ciphertext
 */
const encrypt = async (
    plaintext: bigint,
    pubKey: PubKey,
    randomVal: bigint = genRandomSalt(),
): Promise<ElGamalCiphertext> => {
    const message: Message = await encodeToMessage(plaintext)

    const c1Point: BabyJubPoint = babyJub.mulPointEscalar(babyJub.Base8, randomVal)

    const pky: BabyJubPoint = babyJub.mulPointEscalar(pubKey, randomVal)
    const c2Point: BabyJubPoint = babyJub.addPoint(
        message.point,
        pky,
    )

    return {
        c1: c1Point,
        c2: c2Point,
        xIncrement: message.xIncrement,
    }
}

/*
 * Decrypts a ciphertext using a private key.
 * @param privKey The private key
 * @param ciphertext The ciphertext to decrypt
 */
const decrypt = async (privKey: PrivKey, ciphertext: ElGamalCiphertext): Promise<bigint> => {
    const c1x: [Uint8Array, Uint8Array] = babyJub.mulPointEscalar(
        ciphertext.c1,
        formatPrivKeyForBabyJub(privKey),
    )

    const c1xInverse = [
        F.neg(c1x[0]),
        c1x[1],
    ]

    const decrypted: [Uint8Array, Uint8Array] = babyJub.addPoint(
        c1xInverse,
        ciphertext.c2
    )

    return decodeMessage(
        {
            point: decrypted,
            xIncrement: ciphertext.xIncrement,
        }
    )
}

export {
    Message,
    BabyJubPoint,
    ElGamalCiphertext,
    encodeToMessage,
    decodeMessage,
    encrypt,
    decrypt,
}