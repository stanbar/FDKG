npx circomkit compile pvss_1_of_2
snarkjs groth16 setup build/pvss_1_of_2/pvss_1_of_2.r1cs ptau/powersOfTau28_hez_final_16.ptau groth16_pkey.zkey
mv groth16_pkey.zkey build/pvss_1_of_2/
snarkjs zkey export verificationkey build/pvss_1_of_2/groth16_pkey.zkey build/pvss_1_of_2/groth16_vkey.json

npx circomkit compile pvss_2_of_3
snarkjs groth16 setup build/pvss_2_of_3/pvss_2_of_3.r1cs ptau/powersOfTau28_hez_final_17.ptau groth16_pkey.zkey
mv groth16_pkey.zkey build/pvss_2_of_3/
snarkjs zkey export verificationkey build/pvss_2_of_3/groth16_pkey.zkey build/pvss_2_of_3/groth16_vkey.json

npx circomkit compile pvss_3_of_4
snarkjs groth16 setup build/pvss_3_of_4/pvss_3_of_4.r1cs ptau/powersOfTau28_hez_final_16.ptau groth16_pkey.zkey
mv groth16_pkey.zkey build/pvss_3_of_4/
snarkjs zkey export verificationkey build/pvss_3_of_4/groth16_pkey.zkey build/pvss_3_of_4/groth16_vkey.json

npx circomkit compile pvss_1
snarkjs groth16 setup build/pvss_1/pvss_1.r1cs ptau/powersOfTau28_hez_final_16.ptau groth16_pkey.zkey
mv groth16_pkey.zkey build/pvss_1/
snarkjs zkey export verificationkey build/pvss_1/groth16_pkey.zkey build/pvss_1/groth16_vkey.json

# npx circomkit compile encrypt_ballot
# snarkjs groth16 setup build/encrypt_ballot/encrypt_ballot.r1cs ptau/powersOfTau28_hez_final_14.ptau groth16_pkey.zkey
# mv groth16_pkey.zkey build/encrypt_ballot/
# snarkjs zkey export verificationkey build/encrypt_ballot/groth16_pkey.zkey build/encrypt_ballot/groth16_vkey.json

# npx circomkit compile partial_decryption
# snarkjs groth16 setup build/partial_decryption/partial_decryption.r1cs ptau/powersOfTau28_hez_final_13.ptau groth16_pkey.zkey
# mv groth16_pkey.zkey build/partial_decryption/
# snarkjs zkey export verificationkey build/partial_decryption/groth16_pkey.zkey build/partial_decryption/groth16_vkey.json

# npx circomkit compile decrypt_share
# snarkjs groth16 setup build/decrypt_share/decrypt_share.r1cs ptau/powersOfTau28_hez_final_12.ptau groth16_pkey.zkey
# mv groth16_pkey.zkey build/decrypt_share/
# snarkjs zkey export verificationkey build/decrypt_share/groth16_pkey.zkey build/decrypt_share/groth16_vkey.json