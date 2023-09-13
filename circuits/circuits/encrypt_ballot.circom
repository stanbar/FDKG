pragma circom 2.1.0;

include "../lib/circomlib/circuits/escalarmulany.circom";
include "../lib/circomlib/circuits/babyjub.circom";
include "../lib/circomlib/circuits/bitify.circom";
include "elGamal_c1.circom";

/*
    We use ballot encoding as defined by Baudron et al. Practical multi-candidate election system
    Suppose that we have n voters, choose m so that m is the smallest integer such that 2^m > n.
 */

function find_m_bit(voters) {
    var n = voters;
    var m = 0;
    var val = 1;
    while (val <= n) {
        val *= 2;
        m += 1;
    }
    return m;
}

template EncrytedBallot(voters, options) {
    assert(options > 0);
    var m = find_m_bit(voters);

    signal input votingPublicKey[2];
    signal input cast;
    signal input r;
    signal output out[4];

    component rBits = Num2Bits(253);
    rBits.in <== r;

    component C1 = ElGamalC1();
    C1.rBits <== rBits.out;

    component rP = EscalarMulAny(253);
    rP.p[0] <== votingPublicKey[0];
    rP.p[1] <== votingPublicKey[1];
    rP.e <== rBits.out;


    // ballot encoding as defined by Baudron et al. Practical multi-candidate election system
    assert(1 <= cast <= options);
    signal exponent <== ((cast-1) * m);
    signal message <-- 2 ** exponent; // TODO: unconstrained signal


    component mBits = Num2Bits(253);
    mBits.in <== message;
    
    var BASE8[2] = [
        5299619240641551281634865583518297030282874472190772894086521144482721001553,
        16950150798460657717958625567821834550301663161624707787222815936182638968203
    ];
    component mG = EscalarMulFix(253, BASE8);
    mG.e <== mBits.out;

    // ((c1 ** x) ** - 1) * c2
    component C2 = BabyAdd();
    C2.x1 <== rP.out[0];
    C2.y1 <== rP.out[1];
    C2.x2 <== mG.out[0];
    C2.y2 <== mG.out[1];

    out[0] <== C1.xout;
    out[1] <== C1.yout;
    out[2] <== C2.xout;
    out[3] <== C2.yout;
}