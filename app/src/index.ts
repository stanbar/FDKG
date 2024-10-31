import { Network, Node, Edge } from 'vis-network';
import { DataSet } from 'vis-data';
import * as d3 from 'd3';

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

// Configuration interface for both UI and CLI usage
interface NetworkConfig {
    numberOfNodes: number;
    numberOfGuardians: number;
    trustworthinessMean: number;
    threshold: number;
    physicsEnabled?: boolean;
}

// Interface for UI updates
interface UIHandler {
    updateLabels?: () => void;
    updateDecipherabilityLabel?: () => void;
    updateDecipherabilityResult?: (isDecipherable: boolean) => void;
    renderNetwork?: (nodes: Node[], edges: Edge[]) => void;
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
    private nodes: Node[] = [];
    private edges: Edge[] = [];

    constructor(
        private config: NetworkConfig, 
        private uiHandler?: UIHandler
    ) {
        this.initialize();
    }

    private initialize() {
        this.generateDirectedGraph(
            this.config.numberOfNodes,
            this.config.numberOfGuardians,
            this.config.trustworthinessMean
        );
    }

    // Convert existing functions to methods
    public generateDirectedGraph(N: number, k: number, t: number) {
        this.nodes = [];
        this.edges = [];
        const mean = t;
        const stdDev = t * 1.5;
        const normalDist = d3.randomNormal(mean, stdDev);
        this.fdkgSet.clear();
        this.talliersSet.clear();
        this.decipherabilityStatus.clear();
        this.nodesTrustworthiness.clear();

        // Generate nodes
        for (let i = 0; i < N; i++) {
            const trustworthiness = Math.max(0, normalDist());
            this.nodesTrustworthiness.set(i, trustworthiness);
            
            // Only create visual nodes if we're in UI mode
            if (this.uiHandler?.renderNetwork) {
                this.nodes.push({
                    id: i,
                    label: `Node ${i}`,
                    value: trustworthiness,
                    color: { background: COLOR_GREY },
                });
            }
        }

        // Generate edges
        for (let i = 0; i < N; i++) {
            const potentialGuardians = new Map<number, number>(
                Array.from(this.nodesTrustworthiness.entries()).filter(([id, _]) => id !== i)
            );
            const guardians = this.selectGuardians(potentialGuardians, k);
            this.guardianSets.set(i, new Set(guardians));
            
            // Only create visual edges if we're in UI mode
            if (this.uiHandler?.renderNetwork) {
                guardians.forEach(guardian => {
                    this.edges.push({ from: i, to: guardian });
                });
            }
        }

        // Update UI if handler exists
        this.uiHandler?.renderNetwork?.(this.nodes, this.edges);
    }

    // Helper function to select guardians based on trustworthiness
    public selectGuardians(potentialGuardiansIds: Map<NodeID, Trustworthiness>, k: number): NodeID[] {
        // Validate inputs
        if (k > potentialGuardiansIds.size) {
            throw new Error(`Cannot select ${k} guardians from ${potentialGuardiansIds.size} potential guardians`);
        }

        const selectedGuardians: NodeID[] = [];
        const remainingGuardians = new Map(potentialGuardiansIds);

        while (selectedGuardians.length < k) {
            // Select from remaining guardians to avoid duplicates
            const guardian = this.weightedRandomSelect(remainingGuardians);
            selectedGuardians.push(guardian);
            remainingGuardians.delete(guardian);
        }

        return selectedGuardians;
    }

    // Helper function to perform weighted random selection based on trustworthiness
    public weightedRandomSelect(nodes: Map<NodeID, Trustworthiness> | undefined): NodeID {
        if (!nodes || nodes.size === 0) {
            throw new Error("No nodes available for selection");
        }
        const totalWeight = Array.from(nodes.values()).reduce((sum: number, value: number) => sum + value, 0);
        const threshold = Math.random() * totalWeight;
        let cumulativeWeight = 0;
        for (const [id, value] of nodes.entries()) {
            cumulativeWeight += value;
            if (cumulativeWeight >= threshold) {
                return id;
            }
        }
        return Array.from(nodes.keys())[nodes.size - 1]; // Return last node ID properly
    }

    // Helper function to select another subset based on trustworthiness
    public selectVolunteers(numVolunteers: number): Set<NodeID> {
        const volunteers = new Set<number>();
        // const volunteerDist = d3.randomNormal(numVolunteers, numVolunteers * 0.5);
        // numVolunteers = Math.max(1, Math.min(this.nodesTrustworthiness.size, Math.round(volunteerDist()))); // Use size instead of keys.length

        // Check if we have enough nodes to select from
        if (numVolunteers > this.nodesTrustworthiness.size) {
            throw new Error(`Cannot select ${numVolunteers} volunteers from ${this.nodesTrustworthiness.size} total nodes`);
        }

        while (volunteers.size < numVolunteers) {
            const remainingNodesTrustworthiness = new Map(
                Array.from(this.nodesTrustworthiness).filter(([id]) => !volunteers.has(id))
            );
            
            // Safety check - if no remaining nodes but still need more volunteers
            if (remainingNodesTrustworthiness.size === 0) {
                throw new Error('No more nodes available to select as volunteers');
            }

            const volunteer = this.weightedRandomSelect(remainingNodesTrustworthiness);
            volunteers.add(volunteer);
        }
        return volunteers;
    }

    public rerenderNodes() {
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
        this.uiHandler?.renderNetwork?.(this.nodes, this.edges);
    }

    public checkDecipherability(threshold: number): boolean {
        if (threshold < 0) {
            console.error('Invalid threshold value');
            return false;
        }
        
        let decipherable = true;

        this.fdkgSet.forEach(nodeId => {
            const guardians = this.guardianSets.get(nodeId);
            if (!guardians) return;

            const participatingGuardians = Array.from(guardians)
                .filter(guardianId => this.talliersSet.has(guardianId)).length;
            if (!this.talliersSet.has(nodeId) && participatingGuardians < threshold) {
                decipherable = false;
            }
        });

        this.uiHandler?.updateDecipherabilityResult?.(decipherable);
        return decipherable;
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

            const participatingGuardians = Array.from(guardians).filter(guardianId => this.talliersSet.has(guardianId)).length;

            if (this.talliersSet.has(nodeId)) {
                // Node itself is present in talliersSet
                this.decipherabilityStatus.set(nodeId, '1/1');
            } else {
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

    public selectFDKGSet(size: number): NodeID[] {
        const newFdkgSet = this.selectVolunteers(size);
        this.fdkgSet.clear();
        newFdkgSet.forEach(volunteer => this.fdkgSet.add(volunteer));
        
        this.rerenderNodes();
        this.uiHandler?.updateLabels?.();
        return Array.from(this.fdkgSet);
    }

    public selectTalliersSet(size: number): NodeID[] {
        const newTalliers = this.selectVolunteers(size);
        this.talliersSet.clear();
        newTalliers.forEach(volunteer => this.talliersSet.add(volunteer));
        this.decipherabilityStatus.clear();
        
        this.rerenderNodes();
        this.uiHandler?.updateLabels?.();
        return Array.from(this.talliersSet);
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
        const fdkgLabel = document.createElement('div');
        fdkgLabel.id = 'fdkgLabel';
        fdkgLabel.style.margin = '10px';
        fdkgLabel.innerText = 'FDKG set size: 0';
        document.body.appendChild(fdkgLabel);

        const talliersLabel = document.createElement('div');
        talliersLabel.id = 'talliersLabel';
        talliersLabel.style.margin = '10px';
        talliersLabel.innerText = 'Talliers set size: 0';
        document.body.appendChild(talliersLabel);

        const generateButton = document.getElementById('generateButton');
        const selectFdkgSubset = document.getElementById('selectFdkgButton');
        const selectTalliersSubset = document.getElementById('secondTalliersButton');
        const nodeSlider = document.getElementById('nodeSlider') as HTMLInputElement;
        const guardianSlider = document.getElementById('guardianSlider') as HTMLInputElement;
        const trustSlider = document.getElementById('trustSlider') as HTMLInputElement;
        const physicsSwitch = document.getElementById('physicsSwitch') as HTMLInputElement;
        const thresholdSlider = document.getElementById('thresholdSlider') as HTMLInputElement;

        let simulation: NetworkSimulation;

        // Create UI handler
        const uiHandler: UIHandler = {
            renderNetwork: (nodes: Node[], edges: Edge[]) => {
                const container = document.getElementById('mynetwork');
                if (!container) return;

                const nodesDataset = new DataSet(nodes);
                const edgesDataset = new DataSet(edges);
                
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
            },
            updateLabels: () => {
                const fdkgLabel = document.getElementById('fdkgLabel');
                const talliersLabel = document.getElementById('talliersLabel');
                const simulation = window.simulation; // Access the simulation instance

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
            const decipherable = simulation.checkDecipherability(threshold);

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
                trustworthinessMean: parseInt(trustSlider.value, 10),
                threshold: parseInt(thresholdSlider.value, 10),
                physicsEnabled: physicsSwitch.checked
            };

            simulation = new NetworkSimulation(config, uiHandler);
        });

        selectFdkgSubset?.addEventListener('click', () => {
            if (!simulation) return;
            const k = parseInt(trustSlider.value, 10);
            simulation.selectFDKGSet(k);
            
            const threshold = parseInt(thresholdSlider.value, 10);
            simulation.checkDecipherability(threshold);
            simulation.highlightDecipherableNodes(threshold);
        });

        selectTalliersSubset?.addEventListener('click', () => {
            if (!simulation) return;
            const k = parseInt(trustSlider.value, 10);
            simulation.selectTalliersSet(k);
            
            const threshold = parseInt(thresholdSlider.value, 10);
            simulation.checkDecipherability(threshold);
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
