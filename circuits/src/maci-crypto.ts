import * as crypto from 'crypto'
import assert from 'node:assert';
import * as ff from 'ffjavascript';
import * as createBlakeHash from 'blake-hash';
import * as circomlibjs from 'circomlibjs';

const eddsa = await circomlibjs.buildEddsa()

type PrivKey = bigint
type PubKey = bigint[]

/*
 * A private key and a public key
 */
interface Keypair {
    privKey: PrivKey;
    pubKey: PubKey;
}

// The BN254 group order p
const SNARK_FIELD_SIZE = 21888242871839275222246405745257275088548364400416034343698204186575808495617n

/*
 * Convert a BigInt to a Buffer
 */
const bigInt2Buffer = (i: BigInt): Buffer => {
    return Buffer.from(i.toString(16), 'hex')
}

function buffer2BigInt(buf: ArrayBuffer | Buffer): bigint {
    let bits = 8n
    if (ArrayBuffer.isView(buf)) bits = BigInt(buf.BYTES_PER_ELEMENT * 8)
    else buf = new Uint8Array(buf)

    let ret = 0n
    for (const i of (buf as Buffer).values()) {
        const bi = BigInt(i)
        ret = (ret << bits) + bi
    }
    return ret
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
const genRandomBabyJubValue = (): bigint => {

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

    const privKey: PrivKey = rand % SNARK_FIELD_SIZE
    assert(privKey < SNARK_FIELD_SIZE)

    return privKey
}

/*
 * @return A BabyJub-compatible private key.
 */
const genPrivKey = (): PrivKey => {

    return genRandomBabyJubValue()
}

/*
 * @return A BabyJub-compatible salt.
 */
const genRandomSalt = (): PrivKey => {

    return genRandomBabyJubValue()
}


/*
 * @param privKey A private key generated using genPrivKey()
 * @return A public key associated with the private key
 */
const genPubKey = (privKey: PrivKey): PubKey => {
    // Check whether privKey is a field element
    privKey = BigInt(privKey.toString())
    assert(privKey < SNARK_FIELD_SIZE)
    return eddsa.prv2pub(bigInt2Buffer(privKey))
}

const genKeypair = (): Keypair => {
    const privKey = genPrivKey()
    const pubKey = genPubKey(privKey)

    const Keypair: Keypair = { privKey, pubKey }

    return Keypair
}

/*
 * An internal function which formats a random private key to be compatible
 * with the BabyJub curve. This is the format which should be passed into the
 * PubKey and other circuits.
 */
const formatPrivKeyForBabyJub = (privKey: PrivKey) => {
    const sBuff = eddsa.pruneBuffer(
        createBlakeHash("blake512").update(
            bigInt2Buffer(privKey),
        ).digest().slice(0, 32)
    )
    const s = ff.utils.leBuff2int(sBuff)
    return ff.Scalar.shr(s, 3)
}

export type {
    PubKey,
    PrivKey,
}
export {
    bigInt2Buffer,
    genPubKey,
    genPrivKey,
    formatPrivKeyForBabyJub,
    genKeypair,
    genRandomSalt,
    buffer2BigInt,
}