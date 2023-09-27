import { Circomkit } from "circomkit";

export const circomkit = new Circomkit({
    verbose: false,
    logLevel: "error",
    protocol: "groth16"
});
// import circuits from "../circuits.json" assert { type: "json" };
const circuits = [
    // { circuit: "pvss_3_of_4", ptau: "./ptau/powersOfTau28_hez_final_18.ptau" },
    { circuit: "pvss_2_of_3", ptau: "./ptau/powersOfTau28_hez_final_17.ptau" },
    // { circuit: "pvss_1_of_2", ptau: "./ptau/powersOfTau28_hez_final_16.ptau" },
    // { circuit: "partial_decryption", ptau: "./ptau/powersOfTau28_hez_final_14.ptau" },
    // { circuit: "decrypt_share", ptau: "./ptau/powersOfTau28_hez_final_13.ptau" },
    // { circuit: "encrypt_ballot", ptau: "./ptau/powersOfTau28_hez_final_15.ptau" }
]

for (let { circuit, ptau } of circuits) {
    circomkit.compile(circuit).then(async () => {
        console.log(await circomkit.info(circuit))
        console.log(`Start setup ${circuit}`)
        await circomkit.setup(circuit, ptau)
        console.log(`Finished setup ${circuit}`)
    });
}

