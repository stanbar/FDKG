pragma circom 2.1.0;

include "../lib/circomlib/circuits/bitify.circom";
include "../lib/circomlib/circuits/escalarmulfix.circom";

template ElGamalC1() {
    signal input rBits[253];
    signal output xout;
    signal output yout;

    // C1 = G * r1
    var BASE8[2] = [
        5299619240641551281634865583518297030282874472190772894086521144482721001553,
        16950150798460657717958625567821834550301663161624707787222815936182638968203
    ];
    signal C1[2] <== EscalarMulFix(253, BASE8)(e <== rBits);

    xout <== C1[0];
    yout <== C1[1];
}