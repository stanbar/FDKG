npx circomkit compile pvss_2_of_3
snarkjs plonk setup build/pvss_2_of_3/pvss_2_of_3.r1cs ptau/powersOfTau28_hez_final_17.ptau build/pvss_2_of_3/plonk_pkey.zkey
snarkjs zkey export verificationkey build/pvss_2_of_3/plonk_pkey.zkey build/pvss_2_of_3/plonk_vkey.json

npx circomkit compile pvss_3_of_4
snarkjs plonk setup build/pvss_3_of_4/pvss_3_of_4.r1cs ptau/powersOfTau28_hez_final_18.ptau plonk_pkey.zkey
mv plonk_pkey.zkey build/pvss_3_of_4/
snarkjs zkey export verificationkey build/pvss_3_of_4/plonk_pkey.zkey build/pvss_3_of_4/plonk_vkey.json