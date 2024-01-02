# npx circomkit compile pvss_1_of_2 && \
# snarkjs plonk setup build/pvss_1_of_2/pvss_1_of_2.r1cs ptau/powersOfTau28_hez_final_17.ptau plonk_pkey.zkey && \
# mv plonk_pkey.zkey build/pvss_1_of_2/ && \
# snarkjs zkey export verificationkey build/pvss_1_of_2/plonk_pkey.zkey build/pvss_1_of_2/plonk_vkey.json

# npx circomkit compile pvss_2_of_3 && \
# snarkjs plonk setup build/pvss_2_of_3/pvss_2_of_3.r1cs ptau/powersOfTau28_hez_final_17.ptau plonk_pkey.zkey && \
# mv plonk_pkey.zkey build/pvss_2_of_3 && \
# snarkjs zkey export verificationkey build/pvss_2_of_3/plonk_pkey.zkey build/pvss_2_of_3/plonk_vkey.json

# npx circomkit compile pvss_3_of_4
# snarkjs plonk setup build/pvss_3_of_4/pvss_3_of_4.r1cs ptau/powersOfTau28_hez_final_18.ptau plonk_pkey.zkey
# mv plonk_pkey.zkey build/pvss_3_of_4/
# snarkjs zkey export verificationkey build/pvss_3_of_4/plonk_pkey.zkey build/pvss_3_of_4/plonk_vkey.json

# npx circomkit compile encrypt_ballot
# snarkjs plonk setup build/encrypt_ballot/encrypt_ballot.r1cs ptau/powersOfTau28_hez_final_15.ptau plonk_pkey.zkey
# mv plonk_pkey.zkey build/encrypt_ballot/
# snarkjs zkey export verificationkey build/encrypt_ballot/plonk_pkey.zkey build/encrypt_ballot/plonk_vkey.json

# npx circomkit compile decrypt_share && \
# snarkjs plonk setup build/decrypt_share/decrypt_share.r1cs ptau/powersOfTau28_hez_final_13.ptau plonk_pkey.zkey && \
# mv plonk_pkey.zkey build/decrypt_share/ && \
# snarkjs zkey export verificationkey build/decrypt_share/plonk_pkey.zkey build/decrypt_share/plonk_vkey.json

npx circomkit compile partial_decryption_share
snarkjs plonk setup build/partial_decryption_share/partial_decryption_share.r1cs ptau/powersOfTau28_hez_final_14.ptau plonk_pkey.zkey
mv plonk_pkey.zkey build/partial_decryption_share/
snarkjs zkey export verificationkey build/partial_decryption_share/plonk_pkey.zkey build/partial_decryption_share/plonk_vkey.json

npx circomkit compile partial_decryption
snarkjs plonk setup build/partial_decryption/partial_decryption.r1cs ptau/powersOfTau28_hez_final_15.ptau plonk_pkey.zkey
mv plonk_pkey.zkey build/partial_decryption/
snarkjs zkey export verificationkey build/partial_decryption/plonk_pkey.zkey build/partial_decryption/plonk_vkey.json