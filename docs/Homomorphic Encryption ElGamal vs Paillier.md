Paillier cryptosystem, additively homomorphic, is hard in MPC.

But we can overcome it by using the lookup table, since it's not that big.

Normally people use the Paillier cryptosystem homomorphic trapdoor decryption.
But does not work well in MPC. It's a complicated scheme.

ElGamal is homomorphic over EC.
Paillier is homomorphic over scalars.
Paillier we encrypt the same as RSA.
Paillier decryption is done using trapdoor.
Trapdoor, allows for solving discrete logarithm problem.

For a few parties they use Paillier. We have many parties so we need something different/simplier.
