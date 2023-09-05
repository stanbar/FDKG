/// <reference path='../types/types.d.ts'/>

import assert from "node:assert"
import * as F from "../src/F";
import { BabyJubPoint }  from "../src/babyjub";
import * as babyjub from "../src/babyjub";
import { Scalar } from "ffjavascript";

describe("babyjub", () => {

    it("F.e(gets both bigint numbers and strings", async () => {
        const oneBig = F.e(BigInt(1))
        const oneNumber = F.e(1)
        const oneString = F.e("1")
        const tenHex = F.e("0xA")
        const tenNumberHex = F.e("10")
        assert(F.eq(oneBig, oneNumber))
        assert(F.eq(oneString, oneNumber))
        assert(F.eq(tenHex, tenNumberHex))
    })

    it("Should add point (0,1) and (0,1)", () => {

        const p1: BabyJubPoint = [
            F.e(0),
            F.e(1)];
        const p2: BabyJubPoint = [
            F.e(0),
            F.e(1)
        ];

        const out = babyjub.addPoint(p1, p2);
        assert(F.eq(out[0], F.zero));
        assert(F.eq(out[1], F.one));
    });

    it("Should base be 8*generator", () => {
        let res;
        res = babyjub.addPoint(babyjub.Generator, babyjub.Generator);
        res = babyjub.addPoint(res, res);
        res = babyjub.addPoint(res, res);

        assert(F.eq(res[0], babyjub.Base8[0]));
        assert(F.eq(res[1], babyjub.Base8[1]));
    });
    it("Should add 2 same numbers", () => {

        const p1: BabyJubPoint = [
            F.e("17777552123799933955779906779655732241715742912184938656739573121738514868268"),
            F.e("2626589144620713026669568689430873010625803728049924121243784502389097019475"),
        ];
        const p2: BabyJubPoint = [
            F.e("17777552123799933955779906779655732241715742912184938656739573121738514868268"),
            F.e("2626589144620713026669568689430873010625803728049924121243784502389097019475"),
        ];

        const out = babyjub.addPoint(p1, p2);
        assert(F.eq(out[0], F.e("6890855772600357754907169075114257697580319025794532037257385534741338397365")));
        assert(F.eq(out[1], F.e("4338620300185947561074059802482547481416142213883829469920100239455078257889")));
    });

    it("Should add 2 different numbers", () => {

        const p1: BabyJubPoint = [
            F.e("17777552123799933955779906779655732241715742912184938656739573121738514868268"),
            F.e("2626589144620713026669568689430873010625803728049924121243784502389097019475"),
        ];
        const p2: BabyJubPoint = [
            F.e("16540640123574156134436876038791482806971768689494387082833631921987005038935"),
            F.e("20819045374670962167435360035096875258406992893633759881276124905556507972311"),
        ];

        const out = babyjub.addPoint(p1, p2);
        assert(F.eq(out[0], F.e("7916061937171219682591368294088513039687205273691143098332585753343424131937")));
        assert(F.eq(out[1], F.e("14035240266687799601661095864649209771790948434046947201833777492504781204499")));

    });
    it("should mulPointEscalar 0", () => {
        const p: BabyJubPoint = [
            F.e("17777552123799933955779906779655732241715742912184938656739573121738514868268"),
            F.e("2626589144620713026669568689430873010625803728049924121243784502389097019475"),
        ];

        const r = babyjub.mulPointEscalar(p, 3);
        let r2 = babyjub.addPoint(p, p);
        r2 = babyjub.addPoint(r2, p);
        assert(F.eq(r2[0], r[0]));
        assert(F.eq(r2[1], r[1]));
        assert(F.eq(r[0], F.e("19372461775513343691590086534037741906533799473648040012278229434133483800898")));
        assert(F.eq(r[1], F.e("9458658722007214007257525444427903161243386465067105737478306991484593958249")));
    });

    it("should inCurve 1", () => {
        const p: BabyJubPoint = [
            F.e("17777552123799933955779906779655732241715742912184938656739573121738514868268"),
            F.e("2626589144620713026669568689430873010625803728049924121243784502389097019475"),
        ];
        assert(babyjub.inCurve(p));
    });


    it("calculate shared keys", () => {
        const aliceSk = Scalar.fromString("14035240266687799601661095864649209771790948434046947201833777492504781204499") 
        const alicePub = babyjub.mulPointEscalar(babyjub.Base8, aliceSk)
        assert(babyjub.inCurve(alicePub));

        const bobSk = Scalar.fromString("14035240266687799601661095864127364721649872314987129834789237476544781204499") 
        const bobPub = babyjub.mulPointEscalar(babyjub.Base8, bobSk)
        assert(babyjub.inCurve(bobPub));

        const sharedAliceBob = babyjub.mulPointEscalar(bobPub, aliceSk)
        const sharedBobAlice = babyjub.mulPointEscalar(alicePub, bobSk)
        assert(babyjub.inCurve(sharedBobAlice));
        assert(babyjub.inCurve(sharedAliceBob));

        assert(F.eq(sharedAliceBob[0], sharedBobAlice[0]))
        assert(F.eq(sharedAliceBob[1], sharedBobAlice[1]))
    });
    it("should work conversions", async () => {
        assert(F.eq(F.e(1), F.sub(F.e(2), F.e(1))))
        const oneTwoThree = F.e(123)
        const objected = F.toBigint(oneTwoThree)
        const fromObjected = F.fromBigint(objected)
        assert(F.eq(oneTwoThree, fromObjected))
        assert(123n == objected)
    })
})