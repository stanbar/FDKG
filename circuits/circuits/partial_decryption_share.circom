pragma circom 2.1.0;

include "../lib/circomlib/circuits/escalarmulany.circom";
include "../lib/circomlib/circuits/babyjub.circom";
include "../lib/circomlib/circuits/bitify.circom";
include "decrypt_share.circom";

template PartialDecryptionShare() {
    signal input C1[2];
    signal input encryptedShareC1[2];
    signal input encryptedShareC2[2];
    signal input xIncrement;
    signal input privKey;
    signal input partialDecryption[2];

    signal share <== ElGamalDecrypt()(c1 <== encryptedShareC1,
        c2 <== encryptedShareC2,
        xIncrement <== xIncrement,
        privKey <== privKey);

    signal shareBits[254] <== Num2Bits(254)(share);

    signal outPartialDecryption[2] <== EscalarMulAny(254)(e <== shareBits, p <== C1);

    partialDecryption[0] === outPartialDecryption[0];
    partialDecryption[1] === outPartialDecryption[1];
}