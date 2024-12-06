import { Network, Node, Edge } from 'vis-network';
import { DataSet } from 'vis-data';
import { generateBarabasiAlbertGraph, generateRandomGraph, selectNodesByDegree } from './BarabasiAlbertNetwork';

type NodeID = number;

// Color constants
const COLOR_GREY = 'grey';
const COLOR_YELLOW = 'yellow';
const COLOR_GREEN = '#4D7A3A';
const COLOR_BLUE = '#0000EC';
const COLOR_HIGHLIGHT = '#00FF00'; // Bright green for decipherable nodes

export type NetworkModel = "BarabasiAlbert" | "RandomGraph";
// Configuration interface for both UI and CLI usage
interface NetworkConfig {
    numberOfNodes: number;
    numberOfGuardians: number;
    threshold: number;
    physicsEnabled?: boolean;
    networkModel: NetworkModel;
}

// Interface for UI updates
interface UIHandler {
    updateDecipherabilityResult?: (isDecipherable: boolean) => void;
    renderNetwork?: () => void;
}

// Class to handle the network simulation
class NetworkSimulation {
    private fdkgArray: boolean[]; 
    private talliersArray: boolean[];
    private adjacencyList: number[][] = []; // adjacencyList[nodeId] = array of guardians
    private degrees: number[] = [];
    private decipherabilityStatus: string[] = [];
    public nodes: Node[] = [];
    public edges: Edge[] = [];

    constructor(
        private config: NetworkConfig,
        private uiHandler?: UIHandler,
    ) {
        if (typeof window !== 'undefined') {
            window.simulation = this;
        }
        // Initialize boolean arrays

        this.fdkgArray = new Array(this.config.numberOfNodes).fill(false);
        this.talliersArray = new Array(this.config.numberOfNodes).fill(false);

        this.generateDirectedGraph(
            this.config.numberOfNodes,
            this.config.numberOfGuardians,
        );
    }

    // Convert existing functions to methods
    public generateDirectedGraph(numberOfNodes: number, numberOfGuardians: number) {
        const { adjacencyList, degrees } = this.config.networkModel === "BarabasiAlbert"
            ? generateBarabasiAlbertGraph(numberOfNodes, numberOfGuardians)
            : generateRandomGraph(numberOfNodes, numberOfGuardians);

        // Convert adjacency structure from Map<nodeId, Set<nodeId>> to a simple array of arrays
        this.adjacencyList = [];
        adjacencyList.forEach((guardians, nodeId) => {
            this.adjacencyList[nodeId] = Array.from(guardians);
        });

        this.degrees = degrees;

        // Only create visual nodes if we're in UI mode
        if (this.uiHandler?.renderNetwork) {
            for (let i = 0; i < numberOfNodes; i++) {
                const inDegree = degrees[i] - numberOfGuardians
                if (inDegree < 0) {
                    throw new Error(`Node ${i} has in-degree ${inDegree}`);
                }
                this.nodes.push({
                    id: i,
                    label: `Node ${i}`,
                    value: inDegree,
                    color: { background: COLOR_GREY },
                });
            }

            // Create edges
            for (let from = 0; from < numberOfNodes; from++) {
                for (const to of this.adjacencyList[from]) {
                    this.edges.push({ from, to });
                }
            }
            // Update UI if handler exists
            this.uiHandler?.renderNetwork?.();
        }
    }


    public checkDecipherability(): boolean {
        const threshold = this.config.threshold;
        if (threshold < 0) return false;

        const numNodes = this.degrees.length;
        // For each FDKG node, count how many guardians are in talliers
        for (let nodeId = 0; nodeId < numNodes; nodeId++) {
            if (!this.fdkgArray[nodeId]) continue;
            if (this.talliersArray[nodeId]) continue; // if node itself is a tallier, skip guardian check

            const guardians = this.adjacencyList[nodeId];
            let participatingCount = 0;
            for (let i = 0; i < guardians.length; i++) {
                const guardianId = guardians[i];
                if (this.talliersArray[guardianId]) {
                    participatingCount++;
                    if (participatingCount >= threshold) break;
                }
            }

            if (participatingCount < threshold) return false;
        }

        return true;
    }

    public selectFDKGSet(fkdgPct: number) {
        const size = Math.floor(this.degrees.length * fkdgPct);
        const newFdkgSet = selectNodesByDegree(this.degrees, size);

        // Clear old array and set new FDKG flags
        this.fdkgArray.fill(false);
        newFdkgSet.forEach(nodeId => {
            this.fdkgArray[nodeId] = true;
        });

        this.rerender();
    }

    public selectTalliersSet(retPct: number, newPct: number) {
        const fdkgIndices: number[] = [];
        const nonFdkgIndices: number[] = [];
        
        for (let i = 0; i < this.fdkgArray.length; i++) {
            if (this.fdkgArray[i]) fdkgIndices.push(i);
            else nonFdkgIndices.push(i);
        }

        const retSize = Math.floor(fdkgIndices.length * retPct);
        const talliersFromFdkgSetIndices = selectNodesByDegree(fdkgIndices.map(i => this.degrees[i]), retSize);
        const talliersFromFdkgSet = Array.from(talliersFromFdkgSetIndices).map(idx => fdkgIndices[idx]);

        const newSize = Math.floor(nonFdkgIndices.length * newPct);
        const talliersFromNonFdkgSetIndices = selectNodesByDegree(nonFdkgIndices.map(i => this.degrees[i]), newSize);
        const talliersFromNonFdkgSet = Array.from(talliersFromNonFdkgSetIndices).map(idx => nonFdkgIndices[idx]);

        // Clear old talliers
        this.talliersArray.fill(false);
        // Set new talliers
        for (const id of talliersFromFdkgSet) this.talliersArray[id] = true;
        for (const id of talliersFromNonFdkgSet) this.talliersArray[id] = true;

        this.rerender();
    }
    
    /**
     * Merged UI Update Function
     * This function now:
     * - Updates node colors based on fdkg/talliers membership.
     * - Highlights decipherable nodes (compute decipherabilityStatus).
     * - Updates labels (fdkgLabel, talliersLabel, decipherabilityLabel).
     * - Renders the network.
     * Only runs UI logic if not in CLI mode.
     */
    public rerender() {
        if (!this.uiHandler?.renderNetwork) return;

        const threshold = this.config.threshold;
        const numNodes = this.degrees.length;

        // Compute decipherability status
        // For each fdkg node:
        // - If it's a tallier: status = "1/1"
        // - Else count how many guardians are talliers: "x/threshold"
        for (let nodeId = 0; nodeId < numNodes; nodeId++) {
            this.decipherabilityStatus[nodeId] = '';
            if (this.fdkgArray[nodeId]) {
                if (this.talliersArray[nodeId]) {
                    this.decipherabilityStatus[nodeId] = '1/1';
                } else {
                    const guardians = this.adjacencyList[nodeId];
                    let participatingCount = 0;
                    for (let i = 0; i < guardians.length; i++) {
                        const guardianId = guardians[i];
                        if (this.talliersArray[guardianId]) {
                            participatingCount++;
                            if (participatingCount >= threshold) break;
                        }
                    }
                    this.decipherabilityStatus[nodeId] = `${participatingCount}/${threshold}`;
                }
            }
        }

        // Update node colors
        const updatedNodes = this.nodes.map(node => {
            const nodeId = node.id as number;
            let newColor = COLOR_GREY;

            const isFDKG = this.fdkgArray[nodeId];
            const isTallier = this.talliersArray[nodeId];

            if (isFDKG && isTallier) {
                newColor = COLOR_GREEN;
            } else if (isFDKG) {
                newColor = COLOR_YELLOW;
            } else if (isTallier) {
                newColor = COLOR_BLUE;
            }

            return {
                ...node,
                color: { background: newColor },
            };
        });
        this.nodes = updatedNodes;

        // Update fdkgLabel and talliersLabel
        const fdkgIds = [];
        const talliersIds = [];
        for (let i = 0; i < numNodes; i++) {
            if (this.fdkgArray[i]) fdkgIds.push(i);
            if (this.talliersArray[i]) talliersIds.push(i);
        }

        const fdkgLabel = document.getElementById('fdkgLabel');
        if (fdkgLabel) {
            fdkgLabel.innerText = `FDKG set size: ${fdkgIds.length} | IDs: ${fdkgIds.join(', ')}`;
        }

        const talliersLabel = document.getElementById('talliersLabel');
        if (talliersLabel) {
            talliersLabel.innerText = `Talliers set size: ${talliersIds.length} | IDs: ${talliersIds.join(', ')}`;
        }

        // Update decipherabilityLabel
        const decipherabilityLabel = document.getElementById('decipherabilityLabel');
        if (decipherabilityLabel) {
            let content = 'Decipherability Status:\n';
            for (let i = 0; i < numNodes; i++) {
                if (this.decipherabilityStatus[i]) {
                    content += `Node ${i}: ${this.decipherabilityStatus[i]}\n`;
                }
            }
            decipherabilityLabel.innerText = content.trim();
        }
        const decipherabilityResult = document.getElementById('decipherabilityResult');
        if (decipherabilityResult) {
            const isDecipherable = this.checkDecipherability();
            decipherabilityResult.innerText = `Decipherable: ${isDecipherable ? 'Yes' : 'No'}`;
            decipherabilityResult.style.color = isDecipherable ? 'green' : 'red';
        }


        // Re-render network visually
        this.uiHandler.renderNetwork();
    }
}

// CLI export
export function runSimulation(config: NetworkConfig) {
    const simulation = new NetworkSimulation(config);
    return simulation;
}

// UI initialization
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const generateButton = document.getElementById('generateButton');
        const selectFdkgSubset = document.getElementById('selectFdkgButton');
        const selectTalliersSubset = document.getElementById('secondTalliersButton');
        const nodeSlider = document.getElementById('nodeSlider') as HTMLInputElement;
        const guardianSlider = document.getElementById('guardianSlider') as HTMLInputElement;
        const fdkgPctSlider = document.getElementById('fdkgPctSlider') as HTMLInputElement;
        const retPctSlider = document.getElementById('retPctSlider') as HTMLInputElement;
        const physicsSwitch = document.getElementById('physicsSwitch') as HTMLInputElement;
        const thresholdSlider = document.getElementById('thresholdSlider') as HTMLInputElement;

        let simulation: NetworkSimulation;

        let network: Network;
        // Create UI handler
        const uiHandler: UIHandler = {
            renderNetwork: () => {
                const container = document.getElementById('mynetwork');
                if (!container) return;


                const simulation = window.simulation; // Access the simulation instance
                const nodesDataset = new DataSet(simulation.nodes);
                const edgesDataset = new DataSet(simulation.edges);

                const options = {
                    nodes: {
                        shape: 'dot',
                        scaling: {
                            min: 10,
                            max: 100,
                        },
                        font: {
                            size: 16,
                            color: '#ffffff',
                        },
                    },
                    edges: {
                        arrows: 'to',
                        color: '#848484',
                    },
                    layout: {
                        randomSeed: 2,
                    },
                    physics: {
                        enabled: physicsSwitch?.checked || false, // Disable physics initially
                        stabilization: false,
                        forceAtlas2Based: {
                            springConstant: 0.1,
                        },
                        maxVelocity: 200,
                        solver: "forceAtlas2Based",
                    },
                };

                network = new Network(container,
                    { nodes: nodesDataset, edges: edgesDataset },
                    options
                );
            }
        };
        generateButton?.addEventListener('click', () => {
            const config: NetworkConfig = {
                numberOfNodes: parseInt(nodeSlider.value, 10),
                numberOfGuardians: parseInt(guardianSlider.value, 10),
                threshold: parseInt(thresholdSlider.value, 10),
                physicsEnabled: physicsSwitch.checked,
                networkModel: 'BarabasiAlbert',
            };
        
            simulation = new NetworkSimulation(config, uiHandler);
            window.simulation = simulation;
        });

        selectFdkgSubset?.addEventListener('click', () => {
            if (!simulation) return;
            const fdkgPctVal = parseInt(fdkgPctSlider.value, 10)
            simulation.selectFDKGSet(fdkgPctVal/100.0);
        });

        selectTalliersSubset?.addEventListener('click', () => {
            if (!simulation) return;
            const k = parseInt(retPctSlider.value, 10);
            simulation.selectTalliersSet(k/100.0, 0.05);
        });

        physicsSwitch?.addEventListener('change', () => {
            if (network) {
                network.setOptions({
                    physics: {
                        enabled: physicsSwitch.checked,
                    },
                });
            }
        });
    });
}

// Add type declaration for window
declare global {
    interface Window {
        simulation: NetworkSimulation;
    }
}

// Add at the top of the file
export { NetworkSimulation, NetworkConfig };
