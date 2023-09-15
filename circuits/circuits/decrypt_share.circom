pragma circom 2.1.0;

include "../lib/circomlib/circuits/escalarmulany.circom";
include "../lib/circomlib/circuits/babyjub.circom";
include "../lib/circomlib/circuits/bitify.circom";


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
template ElGamalDecrypt() {
    signal input c1[2];
    signal input c2[2];
    signal input xIncrement;
    signal input privKey;
    signal output plaintext; // TODO: rename out or outScalar

    // Convert the private key to bits
    signal privKeyBits[254] <== Num2Bits(254)(privKey);
    
    // c1 ** x
    signal c1x[2] <== EscalarMulAny(254)(e <== privKeyBits, p <== c1);

    // (c1 ** x) ** -1
    signal c1xInverseX;
    c1xInverseX <== 0 - c1x[0];

    // ((c1 ** x) ** - 1) * c2
    signal xout, yout;
    (xout, yout) <== BabyAdd()(x1 <== c1xInverseX, y1 <== c1x[1], x2 <== c2[0], y2 <== c2[1]);

    plaintext <== xout - xIncrement;
}