pragma circom 2.1.0;

include "../lib/circomlib/circuits/escalarmulany.circom";
include "../lib/circomlib/circuits/babyjub.circom";
include "../lib/circomlib/circuits/bitify.circom";
include "decrypt_share.circom";

/*
 * Decrypts an ElGamal ciphertext.
 * The plaintext is the x-value of the decrypted point minus xIncrement.
 * The comments and signal names follow the symbols used here:
 * https://ethresear.ch/t/maci-anonymization-using-rerandomizable-encryption/7054
 *
 * c1, c2:     The ciphertext
 * xIncrement: Deduct this from the decrypted point's x-value to obtain the
 *             plaintext
 * privKey:    The private key
 * out:        The plaintext
 *
 * m = ((c1 ** x) ** - 1) * c2
 * out = m.x - xIncrement
 */
template PartialDecryption() {
    signal input A[2];
    signal input c1[2];
    signal input c2[2];
    signal input xIncrement;
    signal input privKey;

    signal share <== ElGamalDecrypt()(c1 <== c1, c2 <== c2, xIncrement <== xIncrement, privKey <== privKey);
    log("Decrypted share is", share);

    signal shareBits[254] <== Num2Bits(254)(in <== share);

    signal output partialDecryption[2] <== EscalarMulAny(254)(e <== shareBits, p <== A);
}