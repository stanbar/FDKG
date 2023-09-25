import { Circomkit } from "circomkit";

export const circomkit = new Circomkit({
    verbose: false,
    logLevel: "error",
    protocol: "groth16"
});
import circuits from "../circuits.json" assert { type: "json" };

for (let circuit in circuits) {
        circomkit.compile(circuit).then(() => {
            return circomkit.setup(circuit);
        });   
}

