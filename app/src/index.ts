import { Network, Node, Edge } from 'vis-network';
import { DataSet } from 'vis-data';
import { generateBarabasiAlbertGraph, generateRandomGraph, selectNodesByDegree } from './BarabasiAlbertNetwork';

let network: Network;
let nodesDataset: DataSet<Node>;

type NodeID = number;
type Trustworthiness = number
const nodesTrustworthiness: Map<NodeID, Trustworthiness> = new Map();
const fdkgSet: Set<NodeID> = new Set(); // Add this line
const guardianSets: Map<NodeID, Set<NodeID>> = new Map();
const talliersSet: Set<NodeID> = new Set();
const decipherabilityStatus: Map<NodeID, string> = new Map(); // Map to store Decipherability status

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
    updateDecipherabilityLabel?: () => void;
    updateDecipherabilityResult?: (isDecipherable: boolean) => void;
    renderNetwork?: () => void;
}

// Class to handle the network simulation
class NetworkSimulation {
    public network: Network | null = null;
    public nodesDataset: DataSet<Node> | null = null;
    public nodesTrustworthiness: Map<NodeID, Trustworthiness> = new Map();
    public fdkgSet: Set<NodeID> = new Set();
    public guardianSets: Map<NodeID, Set<NodeID>> = new Map();
    public talliersSet: Set<NodeID> = new Set();
    public decipherabilityStatus: Map<NodeID, string> = new Map();
    public nodes: Node[] = [];
    public edges: Edge[] = [];

    private adjecencyList: Map<NodeID, Set<NodeID>> = new Map();
    private degrees: number[] = [];

    constructor(
        private config: NetworkConfig,
        private uiHandler?: UIHandler,
    ) {
        if (typeof window !== 'undefined') {
            window.simulation = this;
        }
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

        this.adjecencyList = adjacencyList;
        this.degrees = degrees;

        this.nodes = [];
        this.edges = [];
        this.fdkgSet.clear();
        this.talliersSet.clear();
        this.decipherabilityStatus.clear();
        this.nodesTrustworthiness.clear();

        // Generate nodes
        for (let i = 0; i < numberOfNodes; i++) {
            const inDegree = degrees[i] - numberOfGuardians
            if (inDegree < 0) {
                throw new Error(`Node ${i} has in-degree ${inDegree}, total degree: ${degrees[i]}`);
            }
            this.nodesTrustworthiness.set(i, inDegree);
        }

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

            adjacencyList.forEach((guardians, index) => {
                guardians.forEach(guardian => {
                    this.edges.push({ from: index, to: guardian });
                })
            });
            // Update UI if handler exists
            this.uiHandler?.renderNetwork?.();
        }
    }

    public rerender() {
        if (this.uiHandler?.renderNetwork) {

            const updatedNodes = this.nodes.map(node => {
                let newColor = COLOR_GREY;
                const nodeId = node.id as number; // Type assertion since we know our IDs are numbers

                if (this.fdkgSet.has(nodeId) && this.talliersSet.has(nodeId)) {
                    newColor = COLOR_GREEN;
                } else if (this.fdkgSet.has(nodeId)) {
                    newColor = COLOR_YELLOW;
                } else if (this.talliersSet.has(nodeId)) {
                    newColor = COLOR_BLUE;
                }

                return {
                    ...node,
                    color: { background: newColor },
                };
            });

            this.nodes = updatedNodes;
            this.uiHandler?.renderNetwork?.();
        }
    }

    // Optimized decipherability check
    public checkDecipherability(): boolean {
        if (this.config.threshold < 0) return false;

        for (const nodeId of this.fdkgSet) {
            if (this.talliersSet.has(nodeId)) continue;

            const guardians = this.adjecencyList.get(nodeId);
            if (!guardians) continue;

            let participatingCount = 0;
            for (const guardianId of guardians) {
                if (this.talliersSet.has(guardianId)) {
                    participatingCount++;
                    if (participatingCount >= this.config.threshold) break;
                }
            }

            if (participatingCount < this.config.threshold) return false;
        }

        return true;
    }

    public updateLabels() {
        const fdkgLabel = document.getElementById('fdkgLabel');
        const talliersLabel = document.getElementById('talliersLabel');

        if (fdkgLabel) {
            const fdkgIds = Array.from(this.fdkgSet).join(', ');
            fdkgLabel.innerText = `FDKG set size: ${this.fdkgSet.size} | IDs: ${fdkgIds}`;
        }

        if (talliersLabel) {
            const talliersIds = Array.from(this.talliersSet).join(', ');
            talliersLabel.innerText = `Talliers set size: ${this.talliersSet.size} | IDs: ${talliersIds}`;
        }
    }

    public highlightDecipherableNodes(threshold: number) {
        this.decipherabilityStatus.clear(); // Clear the map before each check

        this.fdkgSet.forEach(nodeId => {
            const guardians = this.guardianSets.get(nodeId);
            if (!guardians) return;


            if (this.talliersSet.has(nodeId)) {
                // Node itself is present in talliersSet
                this.decipherabilityStatus.set(nodeId, '1/1');
            } else {
                const participatingGuardians = Array.from(guardians).filter(guardianId => this.talliersSet.has(guardianId)).length;
                // Calculate x/t for guardians
                const status = `${participatingGuardians}/${threshold}`;
                this.decipherabilityStatus.set(nodeId, status);
            }
        });

        this.updateDecipherabilityLabel(); // Update UI display of the Decipherability map
    }

    public updateDecipherabilityLabel() {
        const decipherabilityLabel = document.getElementById('decipherabilityLabel');
        if (decipherabilityLabel) {
            let content = 'Decipherability Status:\n';
            this.decipherabilityStatus.forEach((status, nodeId) => {
                content += `Node ${nodeId}: ${status}\n`;
            });
            decipherabilityLabel.innerText = content.trim();
        }
    }

    // Method to get current state
    public getState() {
        return {
            fdkgSet: Array.from(this.fdkgSet),
            talliersSet: Array.from(this.talliersSet),
            decipherabilityStatus: Object.fromEntries(this.decipherabilityStatus),
            guardianSets: Object.fromEntries(
                Array.from(this.guardianSets.entries()).map(([k, v]) => [k, Array.from(v)])
            )
        };
    }

    public selectFDKGSet(fkdgPct: number) {
        if (fkdgPct < 0 || fkdgPct > 1) {
            throw new Error('fkdgPct should be between 0.0 and 1.0');
        }
        const size = Math.floor(this.degrees.length * fkdgPct);
        const newFdkgSet = selectNodesByDegree(this.degrees, size);
        if (newFdkgSet.size !== size) {
            throw new Error(`Expected newFdkgSet size to be ${size}, but got ${newFdkgSet.size}.`);
        }
        this.fdkgSet = newFdkgSet

        this.rerender();
    }

    public selectTalliersSet(retPct: number, newPct: number) {
        // Ensure percentages are between 0.0 and 1.0
        const retPercentage = Math.max(0, Math.min(retPct, 1));
        const newPercentage = Math.max(0, Math.min(newPct, 1));
        // Prepare degrees for fdkgSet
        const fdkgArray = Array.from(this.fdkgSet);
        const fdkgDegrees = fdkgArray.map(id => this.degrees[id]);
        const retSize = Math.floor(fdkgArray.length * retPercentage);
        const talliersFromFdkgSetIndices = selectNodesByDegree(fdkgDegrees, retSize);
        const talliersFromFdkgSet = Array.from(talliersFromFdkgSetIndices).map(i => fdkgArray[i]);

        // Assertion for fdkgSet selection
        if (talliersFromFdkgSet.length !== retSize) {
            throw new Error(`Expected ${retSize} talliers from fdkgSet, but got ${talliersFromFdkgSet.length}`);
        }
        if (!talliersFromFdkgSet.every(id => this.fdkgSet.has(id))) {
            throw new Error('All nodes in talliersFromFdkgSet should be present in fdkgSet');
        }

        // Select nodes not in fdkgSet
        const allNodeIds = Array.from(this.adjecencyList.keys());
        const nonFdkgSet = new Set<number>();
        for (const nodeId of allNodeIds) {
            if (!this.fdkgSet.has(nodeId)) {
                nonFdkgSet.add(nodeId);
            }
        }
        const nonFdkgArray = Array.from(nonFdkgSet);
        const nonFdkgAvailable = nonFdkgArray.length;
        const newSize = Math.min(nonFdkgAvailable, Math.floor(nonFdkgAvailable * newPercentage));

        const nonFdkgArrayDegrees = nonFdkgArray.map(id => this.degrees[id]);
        const talliersFromNonFdkgSetIndices = selectNodesByDegree(nonFdkgArrayDegrees, newSize);
        const talliersFromNonFdkgSet = Array.from(talliersFromNonFdkgSetIndices).map(i => nonFdkgArray[i]);

        // Assertion for non-fdkgSet selection
        if (talliersFromNonFdkgSet.length !== newSize) {
            throw new Error(`Expected ${newSize} talliers from nonFdkgSet, but got ${talliersFromNonFdkgSet.length}`);
        }
        if (talliersFromNonFdkgSet.some(id => this.fdkgSet.has(id))) {
            throw new Error('Some nodes in talliersFromNonFdkgSet are present in fdkgSet');
        }

        // Combine both selections
        this.talliersSet = new Set<number>([
            ...talliersFromFdkgSet,
            ...talliersFromNonFdkgSet,
        ]);


        this.decipherabilityStatus.clear();
        this.rerender();
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

                // Update labels

                const fdkgLabel = document.getElementById('fdkgLabel');
                const talliersLabel = document.getElementById('talliersLabel');

                if (fdkgLabel && simulation) {
                    const fdkgIds = Array.from(simulation.fdkgSet).join(', ');
                    fdkgLabel.innerText = `FDKG set size: ${simulation.fdkgSet.size} | IDs: ${fdkgIds}`;
                }

                if (talliersLabel && simulation) {
                    const talliersIds = Array.from(simulation.talliersSet).join(', ');
                    talliersLabel.innerText = `Talliers set size: ${simulation.talliersSet.size} | IDs: ${talliersIds}`;
                }

                
            },
            updateDecipherabilityLabel: () => {
                const decipherabilityLabel = document.getElementById('decipherabilityLabel');
                const simulation = window.simulation;

                if (decipherabilityLabel && simulation) {
                    let content = 'Decipherability Status:\n';
                    simulation.decipherabilityStatus.forEach((status: string, nodeId: number) => {
                        content += `Node ${nodeId}: ${status}\n`;
                    });
                    decipherabilityLabel.innerText = content.trim();
                }
            },
            updateDecipherabilityResult: (isDecipherable: boolean) => {
                const decipherabilityResult = document.getElementById('decipherabilityResult');
                if (decipherabilityResult) {
                    decipherabilityResult.innerText =
                        `Decipherability: ${isDecipherable ? 'Achieved' : 'Not Achieved'}`;
                }
            }
        };

        // Add event listener for decipherability check
        const decipherabilityButton = document.getElementById('decipherabilityButton');
        decipherabilityButton?.addEventListener('click', () => {
            const threshold = parseInt(thresholdSlider.value, 10);
            const decipherable = simulation.checkDecipherability();

            // Display result
            const decipherabilityResult = document.getElementById('decipherabilityResult');
            if (decipherabilityResult) {
                decipherabilityResult.innerText = `Decipherability: ${decipherable ? 'Achieved' : 'Not Achieved'}`;
            }
            simulation.highlightDecipherableNodes(threshold);
        });

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

            const threshold = parseInt(thresholdSlider.value, 10);
            simulation.checkDecipherability();
            simulation.highlightDecipherableNodes(threshold);
        });

        selectTalliersSubset?.addEventListener('click', () => {
            if (!simulation) return;
            const k = parseInt(retPctSlider.value, 10);
            simulation.selectTalliersSet(k/100.0, 0.05);

            const threshold = parseInt(thresholdSlider.value, 10);
            simulation.checkDecipherability();
            simulation.highlightDecipherableNodes(threshold);
        });

        physicsSwitch?.addEventListener('change', () => {
            if (simulation?.network) {
                simulation.network.setOptions({
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
