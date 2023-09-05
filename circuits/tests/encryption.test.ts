/// <reference path='../types/types.d.ts'/>

import assert from 'assert';
import * as babyjub from "../src/babyjub";
import { BabyJubPoint }  from "../src/babyjub";
import * as F from "../src/F";

import { Scalar } from "ffjavascript";
import { decodeMessage, decrypt, encodeToMessage, encrypt } from '../src/encryption';

describe('ElGamal encryption and decryption', () => {

    it("should Alice encrypt and Bob decrypt", async () => {
        const plaintext = Scalar.fromString("123") 
        const randomVal = Scalar.fromString("321123456789") 

        const aliceSk = Scalar.fromString("14035240266687799601661095864649209771790948434046947201833777492504781204499") 
        const alicePub = babyjub.mulPointEscalar(babyjub.Base8, aliceSk)
        assert(babyjub.inCurve(alicePub));

        const bobSk = Scalar.fromString("14035240266687799601661095864127364721649872314987129834789237476544781204499") 
        const bobPub = babyjub.mulPointEscalar(babyjub.Base8, bobSk)
        assert(babyjub.inCurve(bobPub));

        // encrypt
        const message = babyjub.mulPointEscalar(babyjub.Generator, plaintext) 
        const c1Point = babyjub.mulPointEscalar(babyjub.Base8, randomVal)

        const pky = babyjub.mulPointEscalar(bobPub, randomVal)
        const c2Point = babyjub.addPoint(
            message,
            pky,
        )

        assert(babyjub.inCurve(c1Point));
        assert(babyjub.inCurve(c2Point));

        // decrypt
        const c1x = babyjub.mulPointEscalar(
            c1Point,
            bobSk,
        )
        const c1xInverse: BabyJubPoint = [
            F.neg(c1x[0]),
            c1x[1],
        ]
        const decrypted = babyjub.addPoint(
            c1xInverse,
            c2Point
        )

        assert(F.eq(decrypted[0], message[0]))
        assert(F.eq(decrypted[1], message[1]))
    })

    it("should encode and decode 123", async () => {
        const secret = 123n
        const message = encodeToMessage(secret)
        const decoded = decodeMessage(message)
        assert(secret == decoded)
    })
    it("should encrypt and decrypt 123", async () => {
        const aliceSk = babyjub.genRandomBabyJubScalar()
        const alicePub = babyjub.mulPointEscalar(babyjub.Base8, aliceSk)

        const bobSk = babyjub.genRandomBabyJubScalar()
        const bobPub = babyjub.mulPointEscalar(babyjub.Base8, bobSk)

        const secret = 123n
        const message = encrypt(secret, bobPub)
        const decoded = decrypt(bobSk, message)
        assert(secret == decoded)
    })
})