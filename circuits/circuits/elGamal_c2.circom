pragma circom 2.1.2;

include "../lib/circomlib/circuits/bitify.circom";
include "../lib/circomlib/circuits/escalarmulfix.circom";
include "../lib/circomlib/circuits/escalarmulany.circom";
include "../lib/circomlib/circuits/babyjub.circom";

template ComputeC2() {
    signal input r1Bits[253];
    signal input r2;
    signal input share;
    signal input recipent_public_key[2];
    signal output xout;
    signal output yout;
    signal output xDelta;

    // r1 * recipent_public_key
    signal rP[2] <== EscalarMulAny(253)(p <== recipent_public_key, e <== r1Bits);

    // M = r2*G
    var BASE8[2] = [
        5299619240641551281634865583518297030282874472190772894086521144482721001553,
        16950150798460657717958625567821834550301663161624707787222815936182638968203
    ];
    // encodeToMessage(eval) -> Message
    signal r2Bits[253] <== Num2Bits(253)(r2);
    signal randomPoint[2] <== EscalarMulFix(253, BASE8)(r2Bits);

    // r * public_key + M
    (xout, yout) <== BabyAdd()(x1 <== rP[0], y1 <== rP[1], x2 <== randomPoint[0], y2 <== randomPoint[1]);

    xDelta <== randomPoint[0] - share;
}