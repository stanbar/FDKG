import { NetworkSimulation, NetworkModel } from './index';
import * as fs from 'fs';
import ProgressBar from 'progress';

// Define parameter ranges
const nodeRanges = [10, 50, 100, 200, 500, 1_000, 10_000];
const guardianRanges = [2, 3, 4, 5, 6, 7];
const fdkgPercentages = [0.1, 0.25, 0.50, 0.75, 1.0];
const tallierReturningPercentages = [0.5, 0.6, 0.7, 0.8, 0.9, 1.0];
const tallierNewPercentages = [0.05];
const networkModel: NetworkModel = "BarabasiAlbert";

// Structure to store results
interface ExperimentResult {
  nodes: number;
  guardians: number;
  threshold: number;
  fdkgPercentage: number;
  tallierRetPct: number;
  tallierNewPct: number;
  successRate: number;
}

const results: ExperimentResult[] = [];

// Number of iterations per configuration to get probability
const ITERATIONS_PER_CONFIG = 1000;

interface Config {
  nodes: number;
  guardians: number;
  threshold: number;
  fdkgPct: number;
  tallierRetPct: number;
  tallierNewPct: number;
}

// Run experiments
for (const nodes of nodeRanges) {
  console.log(`Starting simulations for ${nodes} nodes...`);

  // Process configurations in batches
  const configurations: Config[] = [];
  for (const guardians of guardianRanges) {
    if (guardians >= nodes) continue;
    for (let threshold = 1; threshold <= guardians; threshold++) {
      for (const fdkgPct of fdkgPercentages) {
        for (const tallierRetPct of tallierReturningPercentages) {
          for (const tallierNewPct of tallierNewPercentages) {
              configurations.push({
                nodes, guardians, threshold,
                fdkgPct, tallierRetPct, tallierNewPct
              });
          }
        }
      }
    }
  }

  const nodeBar = new ProgressBar(`[${nodes} nodes] [:bar] :current/:total configurations (:percent) ETA: :etas \n`, {
    total: configurations.length,
    width: 40,
    complete: '=',
    incomplete: ' '
  });

  for (const config of configurations) {
    try {
      let successCount = 0;
      for (let j = 0; j < ITERATIONS_PER_CONFIG; j++) {
        const simulation = new NetworkSimulation({
          numberOfNodes: config.nodes,
          numberOfGuardians: config.guardians,
          threshold: config.threshold,
          networkModel,
        });

        simulation.selectFDKGSet(config.fdkgPct);
        simulation.selectTalliersSet(config.tallierRetPct, config.tallierNewPct);
        if (simulation.checkDecipherability()) {
          successCount++;
        }
      }

      results.push({
        nodes: config.nodes,
        guardians: config.guardians,
        threshold: config.threshold,
        fdkgPercentage: config.fdkgPct, // Store the percentage used in config
        tallierRetPct: config.tallierRetPct,
        tallierNewPct: config.tallierNewPct,
        successRate: successCount / ITERATIONS_PER_CONFIG,
      });
    } catch (error) {
      console.error(`Error in simulation:`, { ...config, error });
      throw error;
    }
    nodeBar.tick();
  }

  // Save intermediate results after each node size
  const intermediateFileName = `simulation_results_nodes_${networkModel}_${nodes}.csv`;
  const csvHeader = `nodes,guardians,threshold,fdkgPercentage,tallierRetPct,tallierNewPct,successRate\n`;
  const csvContent = results.map(r =>
    `${r.nodes},${r.guardians},${r.threshold},${r.fdkgPercentage},${r.tallierRetPct},${r.tallierNewPct},${r.successRate}`
  ).join('\n');

  fs.writeFileSync(intermediateFileName, csvHeader + csvContent);
  console.log(`Intermediate results saved to ${intermediateFileName}`);
}