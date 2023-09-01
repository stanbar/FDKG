pragma circom 2.1.0;

include "../lib/circomlib/circuits/babyjub.circom";
include "../lib/circomlib/circuits/escalarmulany.circom";
include "../lib/circomlib/circuits/bitify.circom";

template PVSS(guardian_set_size, threshold) {
    assert(guardian_set_size >= threshold);
    signal input coefficients[threshold];
    signal input r1[guardian_set_size];
    signal input r2[guardian_set_size];
    // guardian_set_size times [X, Y]
    signal input public_keys[guardian_set_size][2];
    // guardian_set_size times [C1.x, C1.y, C2.x, C2.y, xDelta]
    signal output out[guardian_set_size][5];

    signal shares[guardian_set_size];
    component r1Bits[guardian_set_size];
    component C1[guardian_set_size];
    component rP[guardian_set_size];
    component r2Bits[guardian_set_size];
    component M[guardian_set_size];
    component C2[guardian_set_size];

    // create share for each party
    for (var i = 0; i < guardian_set_size; i++) {
        var eval = coefficients[0];
        for (var j = 1; j < threshold; j++) {
            eval += coefficients[j] * ((i+1) ** j);
        }
        shares[i] <== eval;

        // encrypt the shares
        // Convert randomVal to bits
        r1Bits[i] = Num2Bits(253);
        r1Bits[i].in <== r1[i];

        // C1 = G * r1
        var BASE8[2] = [
            5299619240641551281634865583518297030282874472190772894086521144482721001553,
            16950150798460657717958625567821834550301663161624707787222815936182638968203
        ];
        C1[i] = EscalarMulFix(253, BASE8);
        for (var j = 0; j < 253; j ++) {
            C1[i].e[j] <== r1Bits[i].out[j];
        }

        // C2 = r * public_key + share

        // r1 * public_key
        rP[i] = EscalarMulAny(253);
        rP[i].p[0] <== public_keys[i][0];
        rP[i].p[1] <== public_keys[i][1];
        for (var j = 0; j < 253; j ++) {
            rP[i].e[j] <== r1Bits[i].out[j];
        }
        // M = r2*G
        r2Bits[i] = Num2Bits(253);
        r2Bits[i].in <== r2[i];
        M[i] = EscalarMulFix(253, BASE8);
        for (var j = 0; j < 253; j ++) {
            M[i].e[j] <== r2Bits[i].out[j];
        }

        // r * public_key + M
        C2[i] = BabyAdd();
        C2[i].x1 <== rP[i].out[0];
        C2[i].y1 <== rP[i].out[1];
        C2[i].x2 <== M[i].out[0];
        C2[i].y2 <== M[i].out[1];

        var xDelta = eval - C2[i].xout;
        out[i][0] <== C1[i].out[0]; // C1.x
        out[i][1] <== C1[i].out[1]; // C1.y
        out[i][2] <== C2[i].xout; // C2.x
        out[i][3] <== C2[i].yout; // C2.y
        out[i][4] <== xDelta; // xDelta = share - C2.x
    }
}