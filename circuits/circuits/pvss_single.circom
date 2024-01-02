pragma circom 2.1.0;

include "../lib/circomlib/circuits/bitify.circom";
include "elGamal_c1.circom";
include "elGamal_c2.circom";

template PVSS(guardianIndex, threshold) {
    // assert(guardian_set_size >= threshold);
    signal input coefficients[threshold];
    signal input r1;
    signal input r2;
    signal input guardianPubKey[2];
    signal output out[5];
    signal output votingPublicKey[2];

    signal privKeyBits[253] <== Num2Bits(253)(coefficients[0]);

    signal (votingPubXout, votingPubYout) <== ElGamalC1()(rBits <== privKeyBits);
    // assert that the dealer pub key is the output voting public key derived from private key

    votingPublicKey[0] <== votingPubXout;
    votingPublicKey[1] <== votingPubYout;


    
    // we assume that the guardian index is between 1 and 5, the degree is up to threshold
    // so we can precompute the exponents of exp=guardianIndex+1 ** j
    // exp=1 is not needed
    var EXPONENTS[6][10] = [
        [ 1,1,1,1,1,1,1,1,1,1 ], // guardianIndex = 0
        [ 1, 2, 4, 8, 16, 32, 64, 128, 256, 512], // guardianIndex = 1
        [ 1, 3, 9, 27, 81, 243, 729, 2187, 6561, 19683], // guardianIndex = 2
        [ 1, 4, 16, 64, 256, 1024, 4096, 16384, 65536, 262144 ], // guardianIndex = 3
        [ 1, 5, 25, 125, 625, 3125, 15625, 78125, 390625, 1953125], // guardianIndex = 4
        [ 1, 6, 36, 216, 1296, 7776, 46656, 279936, 1679616, 10077696] // guardianIndex = 5
    ];

    signal eval[threshold];
    eval[0] <== coefficients[0]; // * EXPONENTS[guardianIndex][0] which is always 1 so we don't need to multiply by it
    for (var j = 1; j < threshold; j++) {
        eval[j] <== eval[j-1] + coefficients[j] * EXPONENTS[guardianIndex][j];
    }

    signal r1Bits[253] <== Num2Bits(253)(in <== r1);

    signal (C1X, C1Y) <== ElGamalC1()(rBits <== r1Bits);

    component C2 = ComputeC2();
    C2.r1Bits <== r1Bits;
    C2.r2 <== r2;
    C2.share <== eval[threshold-1];
    C2.recipentPublicKey <== guardianPubKey;

    out[0] <== votingPubXout; // C1.x
    out[1] <== votingPubYout; // C1.y
    out[2] <== C2.xout; // C2.x
    out[3] <== C2.yout; // C2.y
    out[4] <== C2.xDelta; // xDelta = share - C2.x
}