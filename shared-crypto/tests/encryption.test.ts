/// <reference path='../src/types.d.ts'/>

import assert from 'assert';
import { Scalar } from "ffjavascript";
import { pointToScalar, decryptShare, scalarToPoint, encryptShare } from '../src/encryption';
import { BabyJubPoint, Base8, F, addPoint, genPrivKey, genRandomSalt, inCurve, mulPointEscalar } from '../src';
import { Generator } from '../src/babyjub';

describe('ElGamal encryption and decryption', () => {

    it("should Alice encrypt and Bob decrypt", async () => {
        const plaintext = Scalar.fromString("123")
        const randomVal = Scalar.fromString("321123456789")

        const aliceSk = Scalar.fromString("14035240266687799601661095864649209771790948434046947201833777492504781204499")
        const alicePub = mulPointEscalar(Base8, aliceSk)
        assert(inCurve(alicePub));

        const bobSk = Scalar.fromString("14035240266687799601661095864127364721649872314987129834789237476544781204499")
        const bobPub = mulPointEscalar(Base8, bobSk)
        assert(inCurve(bobPub));

        // encrypt
        const message = mulPointEscalar(Generator, plaintext)
        const c1Point = mulPointEscalar(Base8, randomVal)

        const pky = mulPointEscalar(bobPub, randomVal)
        const c2Point = addPoint(
            message,
            pky,
        )

        assert(inCurve(c1Point));
        assert(inCurve(c2Point));

        // decrypt
        const c1x = mulPointEscalar(
            c1Point,
            bobSk,
        )
        const c1xInverse: BabyJubPoint = [
            F.neg(c1x[0]),
            c1x[1],
        ]
        const decrypted = addPoint(
            c1xInverse,
            c2Point
        )

        assert(F.eq(decrypted[0], message[0]))
        assert(F.eq(decrypted[1], message[1]))
    })

    it("should encode and decode 123", async () => {
        const secret = 123n
        const message = scalarToPoint(secret)
        const decoded = pointToScalar(message)
        assert(secret == decoded)
    })
    it("should encrypt and decrypt 123", async () => {
        const aliceSk = genPrivKey()
        const alicePub = mulPointEscalar(Base8, aliceSk)

        const bobSk = genPrivKey()
        const bobPub = mulPointEscalar(Base8, bobSk)

        const secret = 123n

        const message = encryptShare(secret, bobPub)
        const decoded = decryptShare(bobSk, message)

        assert(secret == decoded)
    })
    it("should encrypt and decrypt large values", async () => {
        for (let i = 0; i < 100; i++) {
            const share = genRandomSalt()
            const bobSk = genPrivKey()
            const bobPub = mulPointEscalar(Base8, bobSk)

            const message = encryptShare(share, bobPub)
            const decoded = decryptShare(bobSk, message)

            assert(share == decoded, `[${i}] share ${share} != decoded ${decoded}`)
        }
    })
})