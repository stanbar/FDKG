# Federated Distributed Key Generation (FDKG)

## Overview

**Title:** Federated Distributed Key Generation

**Abstract:** Distributed Key Generation (DKG) is vital to threshold-based cryptographic protocols such as threshold signatures, secure multiparty computation, and i-voting. Yet, standard \((n,t)\)-DKG requires a known set of \(n\) participants and a fixed threshold \(t\), making it impractical for public or decentralized settings where membership and availability can change.

We introduce Federated Distributed Key Generation (FDKG), which relaxes these constraints by allowing each participant to select its own guardian set, with a local threshold to reconstruct that participant's partial key. FDKG generalizes DKG and draws inspiration from Federated Byzantine Agreement, enabling dynamic trust delegation with minimal message complexity (two rounds). The protocol's liveness can tolerate adversary that controls up to \(k - t + 1\) nodes in every guardian set. The paper presents a detailed protocol, a formal description of liveness, privacy, and integrity properties, and a simulation-based evaluation showcasing the efficacy of FDKG in mitigating node unreliability.

In a setting of 100 parties, a 50% participation rate, 80% retention, and 40 guardians, the distribution phase incurred a total message size of 332.7 kB (\(O(n\,k)\)), and reconstruction phase 416.56 kB (\(O(n\,k)\)). Groth16 client-side proving took about 5 s in the distribution phase and ranged from 0.619 s up to 29.619 s in the reconstruction phase.

Our work advances distributed cryptography by enabling flexible trust models for dynamic networks, with applications ranging from ad-hoc collaboration to blockchain governance.

## Repository Structure

This repository contains the implementation and evaluation of the Federated Distributed Key Generation (FDKG) protocol. Below is a brief overview of the key components and files in the repository:

### Key Components

- **FDKG Protocol Implementation:** The core implementation of the FDKG protocol, allowing dynamic trust delegation and key generation in decentralized settings.
- **Simulation and Evaluation:** Tools and scripts to simulate network conditions and evaluate the performance and robustness of the FDKG protocol.
- **Cryptographic Utilities:** Shared cryptographic functions and utilities used across the protocol implementation.

### Directory Structure

- **`app/`**: Contains the main application code for the FDKG protocol.
  - **`src/`**: Source files for the FDKG implementation.
    - **`index.ts`**: Entry point for the application.
    - **`party.ts`**: Defines the `LocalParty` class, which represents a participant in the FDKG protocol.
    - **`utils.ts`**: Utility functions for generating nodes and handling cryptographic operations.
    - **`messageboard.ts`**: Manages the message board for DKG contributions and voting.
  - **`tests/`**: Contains test files for the FDKG implementation.
    - **`fdkg.test.ts`**: Tests for the FDKG protocol without proofs.
- **`circuits/`**: Circom circuits used for cryptographic proofs.
  - **`pvss.circom`**: Circuit for the Publicly Verifiable Secret Sharing (PVSS) scheme.
- **`liveness_sim/`**: Rust-based simulation for evaluating the liveness of the FDKG protocol under various network conditions.
  - **`src/main.rs`**: Main file for running liveness simulations.

### Installation and Usage

1. **Initialize Submodules:**
   ```bash
   git submodule update --init --recursive
   ```

2. **Generate Circuits:**
   Navigate to the `circuits` folder and follow the instructions in the README.md file there.

3. **Run Simulations:**
   Use the Rust-based simulation tool to evaluate the protocol under different network models:
   ```bash
   cargo run --release -- <network_model>
   ```

4. **Run Tests:**
   Execute the test suite to verify the implementation:
   ```bash
   npm test
   ```

### References
- **Article**: https://doi.org/10.1016/j.future.2025.108226
- **Paper:** [Federated Distributed Key Generation](https://stan.bar/slides/2023-10-22-A-Voter-to-Voter-voting-protocol.pdf)
- **Related Work:** Refer to the `paper/main.tex` and `paper/bibliography.bib` for detailed discussions and references on related cryptographic protocols and research.

This README provides a comprehensive overview of the FDKG project, its implementation, and how to use the codebase for further research and development.