npx circomkit compile pvss_1_of_2 && \
snarkjs fflonk setup build/pvss_1_of_2/pvss_1_of_2.r1cs ptau/powersOfTau28_hez_final_20.ptau fflonk_pkey.zkey && \
mv fflonk_pkey.zkey build/pvss_1_of_2/ && \
snarkjs zkey export verificationkey build/pvss_1_of_2/fflonk_pkey.zkey build/pvss_1_of_2/fflonk_vkey.json

npx circomkit compile pvss_2_of_3 
snarkjs fflonk setup build/pvss_2_of_3/pvss_2_of_3.r1cs ptau/powersOfTau28_hez_final_20.ptau fflonk_pkey.zkey
mv fflonk_pkey.zkey build/pvss_2_of_3/
snarkjs zkey export verificationkey build/pvss_2_of_3/fflonk_pkey.zkey build/pvss_2_of_3/fflonk_vkey.json

npx circomkit compile pvss_3_of_4
snarkjs fflonk setup build/pvss_3_of_4/pvss_3_of_4.r1cs ptau/powersOfTau28_hez_final_21.ptau fflonk_pkey.zkey
mv fflonk_pkey.zkey build/pvss_3_of_4/
snarkjs zkey export verificationkey build/pvss_3_of_4/fflonk_pkey.zkey build/pvss_3_of_4/fflonk_vkey.json

npx circomkit compile encrypt_ballot
snarkjs fflonk setup build/encrypt_ballot/encrypt_ballot.r1cs ptau/powersOfTau28_hez_final_18.ptau fflonk_pkey.zkey
mv fflonk_pkey.zkey build/encrypt_ballot/
snarkjs zkey export verificationkey build/encrypt_ballot/fflonk_pkey.zkey build/encrypt_ballot/fflonk_vkey.json

npx circomkit compile partial_decryption
snarkjs fflonk setup build/partial_decryption/partial_decryption.r1cs ptau/powersOfTau28_hez_final_17.ptau fflonk_pkey.zkey
mv fflonk_pkey.zkey build/partial_decryption/
snarkjs zkey export verificationkey build/partial_decryption/fflonk_pkey.zkey build/partial_decryption/fflonk_vkey.json

npx circomkit compile decrypt_share
snarkjs fflonk setup build/decrypt_share/decrypt_share.r1cs ptau/powersOfTau28_hez_final_16.ptau fflonk_pkey.zkey
mv fflonk_pkey.zkey build/decrypt_share/
snarkjs zkey export verificationkey build/decrypt_share/fflonk_pkey.zkey build/decrypt_share/fflonk_vkey.json