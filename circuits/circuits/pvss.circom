pragma circom 2.1.0;

include "../lib/circomlib/circuits/babyjub.circom";
include "../lib/circomlib/circuits/escalarmulany.circom";
include "../lib/circomlib/circuits/bitify.circom";
include "elGamal_c1.circom";

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


template PVSS(guardian_set_size, threshold) {
    // assert(guardian_set_size >= threshold);
    signal input coefficients[threshold];
    signal input r1[guardian_set_size];
    signal input r2[guardian_set_size];
    // guardian_set_size times [X, Y]
    signal input guardiansPubKeys[guardian_set_size][2];

    // guardian_set_size times [C1.x, C1.y, C2.x, C2.y, xDelta]
    signal input encryptedShares[guardian_set_size][5];
    signal input votingPublicKey[2];

    component r1Bits[guardian_set_size];
    component C1[guardian_set_size];
    component rP[guardian_set_size];
    component randomPoint[guardian_set_size];
    component C2[guardian_set_size];


    signal privKeyBits[253] <== Num2Bits(253)(coefficients[0]);
    

    signal (votingPubXout, votingPubYout);
    (votingPubXout, votingPubYout) <== ElGamalC1()(rBits <== privKeyBits);
    
    votingPublicKey[0] === votingPubXout;
    votingPublicKey[1] === votingPubYout;

    var EXPONENTS[6][10] = [
        [ 1,1,1,1,1,1,1,1,1,1 ], // guardianIndex = 0
        [ 1, 2, 4, 8, 16, 32, 64, 128, 256, 512], // guardianIndex = 1
        [ 1, 3, 9, 27, 81, 243, 729, 2187, 6561, 19683], // guardianIndex = 2
        [ 1, 4, 16, 64, 256, 1024, 4096, 16384, 65536, 262144 ], // guardianIndex = 3
        [ 1, 5, 25, 125, 625, 3125, 15625, 78125, 390625, 1953125], // guardianIndex = 4
        [ 1, 6, 36, 216, 1296, 7776, 46656, 279936, 1679616, 10077696] // guardianIndex = 5
    ];

    var BABYJUB_BASE8_ORDER = 2736030358979909402780800718157159386076813972158567259200215660948447373041;
    signal eval[guardian_set_size][threshold];
    for (var i = 0; i < guardian_set_size; i++) {
        eval[i][0] <== coefficients[0];
        var x = i+1;
        for (var j = 1; j < threshold; j++) {
            var exp = (x ** j) % BABYJUB_BASE8_ORDER; // EXPONENTS[i+1][j]; // ((i+1) ** j); 
            // log("exp[",i,"][",j,"]", exp);
            // log("coeff[",j,"]", coefficients[j]);
            var mul = (coefficients[j] * exp) % BABYJUB_BASE8_ORDER;
            // log("mul[",i,"][",j,"]", mul);
            eval[i][j] <-- (eval[i][j-1] + mul) % BABYJUB_BASE8_ORDER;
            // log("eval[",i,"][",j,"]", eval[i][j]);
        }


        // log("shares[i]", shares[i]);
        // shares[i] === eval[i][threshold-1];
        r1Bits[i] = Num2Bits(253);
        r1Bits[i].in <== r1[i];

        C1[i] = ElGamalC1();
        C1[i].rBits <== r1Bits[i].out;

        // C2 = r * public_key + share
        C2[i] = ComputeC2();
        C2[i].r1Bits <== r1Bits[i].out;
        C2[i].r2 <== r2[i];
        C2[i].share <== eval[i][threshold-1];// eval[i][threshold-1]; // share;
        C2[i].recipent_public_key <== guardiansPubKeys[i];

        // out[i][0] <== C1[i].xout; // C1.x
        // out[i][1] <== C1[i].yout; // C1.y
        // out[i][2] <== C2[i].xout; // C2.x
        // out[i][3] <== C2[i].yout; // C2.y
        // out[i][4] <== C2[i].xDelta; // xDelta = share - C2.x

        encryptedShares[i][0] === C1[i].xout; // C1.x
        encryptedShares[i][1] === C1[i].yout; // C1.y
        encryptedShares[i][2] === C2[i].xout; // C1.x
        encryptedShares[i][3] === C2[i].yout; // C1.y
        encryptedShares[i][4] === C2[i].xDelta; // xDelta = share - C2.x
    }
}