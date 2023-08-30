pragma circom 2.0.0;

include "./node_modules/circomlib/circuits/escalarmulany.circom";
include "./node_modules/circomlib/circuits/babyjub.circom";
include "./node_modules/circomlib/circuits/bitify.circom";

template PVSS(guardian_set_size, threshold) {
    assert(guardian_set_size >= threshold, "guardian_set_size must be greater than threshold");
    signal private input coefficients[threshold];
    signal private input private_key;
    signal private input r1[guardian_set_size];
    signal private input r2[guardian_set_size];
    // guardian_set_size times [X, Y]
    signal input public_keys[guardian_set_size][2] 
    // guardian_set_size times [C1.x, C1.y, C2.x, C2.y, xDelta]
    signal output out[guardian_set_size][5] 

    signal shares[guardian_set_size]
    // create share for each party
    for (var i = 1; i <= guardian_set_size; i++) {
        var eval = coefficients[0];
        for (var j = 1; j < threshold; j++) {
            eval += coefficients[j] * (i ** j);
        }
        shares[i-1] <== eval;

        // encrypt the shares
        // Convert randomVal to bits
        component r1Bits = Num2Bits(253);
        r1Bits.in <== r1[i-1];

        // C1 = G * r1
        var BASE8[2] = [
            5299619240641551281634865583518297030282874472190772894086521144482721001553,
            16950150798460657717958625567821834550301663161624707787222815936182638968203
        ];
        component C1 = EscalarMulFix(253, BASE8);
        for (var i = 0; i < 253; i ++) {
            C1.e[i] <== r1Bits.out[i];
        }

        // C2 = r * public_key + share

        // r2 * public_key
        component rP = EscalarMulFix(253, public_keys[i-1]);
        for (var j = 0; j < 253; j ++) {
            rP.e[j] <== rBits.out[j];
        }
        // M = r2*G
        component r2Bits = Num2Bits(253);
        r2Bits.in <== r2[i-1];
        component M = EscalarMulFix(253, BASE8);
        for (var i = 0; i < 253; i ++) {
            M.e[i] <== r2Bits.out[i];
        }

        // r * public_key + M
        component C2 = BabyAdd();
        C2.x1 <== rP.out[0];
        C2.y1 <== rP.out[1];
        C2.x2 <== M.out[0];
        C2.y2 <== M.out[1];

        var xDelta = share - C2.out[0];
        out[i-1][0] <== C1.out[0]; // C1.x
        out[i-1][1] <== C1.out[1]; // C1.y
        out[i-1][2] <== C2.out[0]; // C2.x
        out[i-1][3] <== C2.out[1]; // C2.y
        out[i-1][4] <== xDelta; // xDelta = share - C2.x
    }
}