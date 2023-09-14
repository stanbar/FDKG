import { Circomkit } from "circomkit";

export const circomkit = new Circomkit({
  verbose: false,
  logLevel: "error",
  protocol: "groth16"
});
