pragma circom 2.1.0;

include "../lib/circomlib/circuits/escalarmulany.circom";
include "../lib/circomlib/circuits/babyjub.circom";
include "../lib/circomlib/circuits/bitify.circom";
include "decrypt_share.circom";

template PartialDecryption() {
    signal input C1[2];
    signal input partialDecryption[2];
    signal input partialEncryptionKey[2];
    signal input partialPrivKey;

    signal partialPrivKeyBits[254] <== Num2Bits(254)(partialPrivKey);
    var BASE8[2] = [
        5299619240641551281634865583518297030282874472190772894086521144482721001553,
        16950150798460657717958625567821834550301663161624707787222815936182638968203
    ];
    signal E_i[2] <== EscalarMulFix(254, BASE8)(partialPrivKeyBits);
    partialEncryptionKey[0] === E_i[0];
    partialEncryptionKey[1] === E_i[1];

    signal outPartialDecryption[2] <== EscalarMulAny(254)(e <== partialPrivKeyBits, p <== C1);
    partialDecryption[0] === outPartialDecryption[0];
    partialDecryption[1] === outPartialDecryption[1];
}