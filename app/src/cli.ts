import { NetworkSimulation, NetworkConfig } from './index';
import * as fs from 'fs';
import ProgressBar from 'progress';

// Define parameter ranges
const nodeRanges = [100, 1000];
const guardianRanges = Array.from({length: 10}, (_, i) => i + 1);
const trustworthinessRanges = [10, 30, 50, 100];
const fdkgPercentages = [0.05, 0.10, 0.30, 0.50];
const tallierPercentages = [0.05, 0.10, 0.30, 0.50];

// Structure to store results
interface ExperimentResult {
    nodes: number;
    guardians: number;
    threshold: number;
    trustworthiness: number;
    fdkgPercentage: number;
    tallierPercentage: number;
    successRate: number;
}

const results: ExperimentResult[] = [];

// Number of iterations per configuration to get probability
const ITERATIONS_PER_CONFIG = 100;

// Run experiments
for (const nodes of nodeRanges) {
    console.log(`Starting simulations for ${nodes} nodes...`);
    
    // Calculate total iterations for this node size
    const currentNodeIterations = guardianRanges
        .filter(g => g < nodes)
        .reduce((acc, guardians) => 
            acc + guardians * trustworthinessRanges.length * fdkgPercentages.length * tallierPercentages.length, 
        0);

    const nodeBar = new ProgressBar(`[${nodes} nodes] [:bar] :current/:total configurations (:percent) ETA: :etas`, {
        total: currentNodeIterations,
        width: 40,
        complete: '=',
        incomplete: ' '
    });
    
    for (const guardians of guardianRanges) {
        if (guardians >= nodes) continue;

        // Only test thresholds up to number of guardians
        for (let threshold = 1; threshold <= guardians; threshold++) {
            for (const trustworthiness of trustworthinessRanges) {
                for (const fdkgPct of fdkgPercentages) {
                    for (const tallierPct of tallierPercentages) {
                        // console.log(`    Processing threshold=${threshold} for guardians=${guardians} and nodes=${nodes} trust=${trustworthiness} fdkgPct=${fdkgPct} tallierPct=${tallierPct}`);
                        try {
                            let successCount = 0;
                            nodeBar.tick();

                            for (let i = 0; i < ITERATIONS_PER_CONFIG; i++) {
                                const config: NetworkConfig = {
                                    numberOfNodes: nodes,
                                    numberOfGuardians: guardians,
                                    trustworthinessMean: trustworthiness,
                                    threshold: threshold
                                };

                                const simulation = new NetworkSimulation(config, {
                                    updateDecipherabilityResult: () => {}
                                });

                                const fdkgSize = Math.floor(nodes * fdkgPct);
                                const tallierSize = Math.floor(nodes * tallierPct);

                                simulation.selectFDKGSet(fdkgSize);
                                simulation.selectTalliersSet(tallierSize);

                                const isDecipherable = simulation.checkDecipherability(threshold);
                                if (isDecipherable) successCount++;
                            }

                            results.push({
                                nodes,
                                guardians,
                                threshold,
                                trustworthiness,
                                fdkgPercentage: fdkgPct,
                                tallierPercentage: tallierPct,
                                successRate: successCount / ITERATIONS_PER_CONFIG
                            });

                            // Log progress
                            // console.log(`    Completed: N=${nodes}, G=${guardians}, T=${threshold}, Trust=${trustworthiness}, FDKG%=${fdkgPct}, Tallier%=${tallierPct}, Success=${successCount / ITERATIONS_PER_CONFIG}`);
                        } catch (error) {
                            console.error(`Error in simulation:`, {
                                nodes,
                                guardians,
                                threshold,
                                trustworthiness,
                                fdkgPct,
                                tallierPct,
                                error 
                            });
                        }
                    }
                }
            }
        }
    }
    
    // Save intermediate results after each node size
    const intermediateFileName = `simulation_results_nodes_${nodes}.csv`;
    const csvHeader = 'nodes,guardians,threshold,trustworthiness,fdkgPercentage,tallierPercentage,successRate\n';
    const csvContent = results.map(r => 
        `${r.nodes},${r.guardians},${r.threshold},${r.trustworthiness},${r.fdkgPercentage},${r.tallierPercentage},${r.successRate}`
    ).join('\n');
    
    fs.writeFileSync(intermediateFileName, csvHeader + csvContent);
    console.log(`Intermediate results saved to ${intermediateFileName}`);
}

// Save results to CSV
const csvHeader = 'nodes,guardians,threshold,trustworthiness,fdkgPercentage,tallierPercentage,successRate\n';
const csvContent = results.map(r => 
    `${r.nodes},${r.guardians},${r.threshold},${r.trustworthiness},${r.fdkgPercentage},${r.tallierPercentage},${r.successRate}`
).join('\n');

fs.writeFileSync('simulation_results.csv', csvHeader + csvContent);
console.log('Results saved to simulation_results.csv'); 