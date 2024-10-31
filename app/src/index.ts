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


function generateDirectedGraph(N: number, k: number, t: number) {
    // Generate nodes with trustworthiness values from normal distribution
    const nodes: Node[] = [];
    const mean = t;
    const stdDev = t * 1.5;
    const normalDist = d3.randomNormal(mean, stdDev);
    fdkgSet.clear(); // Clear the FDKG set before generating new nodes
    talliersSet.clear(); // Clear the Talliers set before generating new nodes
    decipherabilityStatus.clear(); // Clear the Decipherability map before generating
    nodesTrustworthiness.clear();

    for (let i = 0; i < N; i++) {
        const trustworthiness = Math.max(0, normalDist()); // Ensure non-negative trustworthiness
        nodesTrustworthiness.set(i, trustworthiness);
        nodes.push({
            id: i,
            label: `Node ${i}`,
            value: trustworthiness,
            color: { background: COLOR_GREY }, // Set default color to grey
        });
    }

    // Assign guardians to each node based on trustworthiness
    const edges: Edge[] = [];
    for (let i = 0; i < N; i++) {
        const potentialGuardians = new Map<number, number>(
            Array.from(nodesTrustworthiness.entries()).filter(([id, _]) => id !== i)
        );
        const guardians = selectGuardians(potentialGuardians, k);
        guardianSets.set(i, new Set(guardians));
        guardians.forEach(guardian => {
            edges.push({ from: i, to: guardian });
        });
    }

    // Create a container for visualization
    const container = document.getElementById('mynetwork');
    if (!container) {
        console.error('Network container not found');
        return; // Exit gracefully instead of throwing
    }

    // Define graph data and options
    const physicsSwitch = document.getElementById('physicsSwitch') as HTMLInputElement;
    nodesDataset = new DataSet(nodes);
    const data = {
        nodes: nodesDataset,
        edges: new DataSet(edges),
    };
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

    // Instantiate and visualize the graph without physics
    network = new Network(container, data, options);
}

// Helper function to select guardians based on trustworthiness
function selectGuardians(potentialGuardiansIds: Map<NodeID, Trustworthiness>, k: number): NodeID[] {
    const selectedGuardians: NodeID[] = [];
    while (selectedGuardians.length < k) {
        const guardian = weightedRandomSelect(potentialGuardiansIds);
        if (!selectedGuardians.includes(guardian)) {
            selectedGuardians.push(guardian);
        }
    }
    return selectedGuardians;
}

// Helper function to perform weighted random selection based on trustworthiness
function weightedRandomSelect(nodes: Map<NodeID, Trustworthiness> | undefined): NodeID {
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
function selectVolunteers(numVolunteers: number): Set<NodeID> {
    const volunteers = new Set<number>();
    // Get all nodes and determine new volunteer selection
    const volunteerDist = d3.randomNormal(numVolunteers, numVolunteers * 0.5);
    numVolunteers = Math.max(1, Math.min(nodesTrustworthiness.size, Math.round(volunteerDist()))); // Use size instead of keys.length

    while (volunteers.size < numVolunteers) {
        const remainingNodesTrustworthiness = new Map(
            Array.from(nodesTrustworthiness).filter(([id]) => !volunteers.has(id))
        );
        const volunteer = weightedRandomSelect(remainingNodesTrustworthiness);
        volunteers.add(volunteer);
    }
    return volunteers;
}

function rerenderNodes() {
    // Update all nodes in a single update call, ensuring correct color updates
    const updatedNodes: Node[] = [];
    nodesDataset.get().forEach(node => {
        let newColor = COLOR_GREY;
        if (typeof node.id === "string") {
            throw new Error("Node ID is not a number");
        }
        if (fdkgSet.has(node.id) && talliersSet.has(node.id)) {
            newColor = COLOR_GREEN; // Node is in both FDKG and Talliers
        } else if (fdkgSet.has(node.id)) {
            newColor = COLOR_YELLOW; // Node is in FDKG only
        } else if (talliersSet.has(node.id)) {
            newColor = COLOR_BLUE; // Node is in Talliers only
        }

        updatedNodes.push({
            ...node,
            color: { background: newColor },
        });
    });

    nodesDataset.update(updatedNodes);

}

function checkDecipherability(threshold: number) {
    if (threshold < 0 || threshold > guardianSets.values().next().value?.size) {
        console.error('Invalid threshold value');
        return;
    }
    
    let decipherable = true;

    fdkgSet.forEach(nodeId => {
        const guardians = guardianSets.get(nodeId);
        if (!guardians) return;

        // Check if the node is in the talliers set or if at least 'threshold' guardians are in the talliers set
        const participatingGuardians = Array.from(guardians).filter(guardianId => talliersSet.has(guardianId)).length;
        if (!talliersSet.has(nodeId) && participatingGuardians < threshold) {
            decipherable = false;
        }
    });

    // Display result
    const decipherabilityResult = document.getElementById('decipherabilityResult');
    if (decipherabilityResult) {
        decipherabilityResult.innerText = `Decipherability: ${decipherable ? 'Achieved' : 'Not Achieved'}`;
    }
}

function updateLabels() {
    const fdkgLabel = document.getElementById('fdkgLabel');
    const talliersLabel = document.getElementById('talliersLabel');

    if (fdkgLabel) {
        const fdkgIds = Array.from(fdkgSet).join(', ');
        fdkgLabel.innerText = `FDKG set size: ${fdkgSet.size} | IDs: ${fdkgIds}`;
    }

    if (talliersLabel) {
        const talliersIds = Array.from(talliersSet).join(', ');
        talliersLabel.innerText = `Talliers set size: ${talliersSet.size} | IDs: ${talliersIds}`;
    }
}

function highlightDecipherableNodes(threshold: number) {
    decipherabilityStatus.clear(); // Clear the map before each check

    fdkgSet.forEach(nodeId => {
        const guardians = guardianSets.get(nodeId);
        if (!guardians) return;

        const participatingGuardians = Array.from(guardians).filter(guardianId => talliersSet.has(guardianId)).length;

        if (talliersSet.has(nodeId)) {
            // Node itself is present in talliersSet
            decipherabilityStatus.set(nodeId, '1/1');
        } else {
            // Calculate x/t for guardians
            const status = `${participatingGuardians}/${threshold}`;
            decipherabilityStatus.set(nodeId, status);
        }
    });

    updateDecipherabilityLabel(); // Update UI display of the Decipherability map
}

function updateDecipherabilityLabel() {
    const decipherabilityLabel = document.getElementById('decipherabilityLabel');
    if (decipherabilityLabel) {
        let content = 'Decipherability Status:\n';
        decipherabilityStatus.forEach((status, nodeId) => {
            content += `Node ${nodeId}: ${status}\n`;
        });
        decipherabilityLabel.innerText = content.trim();
    }
}

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

    // Add event listener for decipherability check
    const decipherabilityButton = document.getElementById('decipherabilityButton');
    decipherabilityButton?.addEventListener('click', () => {
        const threshold = parseInt(thresholdSlider.value, 10);
        checkDecipherability(threshold);
        highlightDecipherableNodes(threshold); // Highlight nodes that achieve Decipherability
    });

    generateButton?.addEventListener('click', () => {
        const N = parseInt(nodeSlider.value, 10);
        const k = parseInt(guardianSlider.value, 10);
        const t = parseInt(trustSlider.value, 10);
        generateDirectedGraph(N, k, t);
        updateLabels();

        const threshold = parseInt(thresholdSlider.value, 10);
        checkDecipherability(threshold);
        highlightDecipherableNodes(threshold); // Highlight nodes that achieve Decipherability
    });

    selectFdkgSubset?.addEventListener('click', () => {
        const k = parseInt(trustSlider.value, 10);
        const newFdkgSet = selectVolunteers(k);
        fdkgSet.clear();
        newFdkgSet.forEach(volunteer => fdkgSet.add(volunteer));
        
        rerenderNodes();
        updateLabels();

        const threshold = parseInt(thresholdSlider.value, 10);
        checkDecipherability(threshold);
        highlightDecipherableNodes(threshold);
    });

    selectTalliersSubset?.addEventListener('click', () => {
        const k = parseInt(trustSlider.value, 10);
        const newTalliers = selectVolunteers(k);
        talliersSet.clear();
        newTalliers.forEach(volunteer => talliersSet.add(volunteer));
        decipherabilityStatus.clear(); // Clear the Decipherability map when selecting new FDKG set

        rerenderNodes();
        updateLabels();

        const threshold = parseInt(thresholdSlider.value, 10);
        checkDecipherability(threshold);
        highlightDecipherableNodes(threshold); // Highlight nodes that achieve Decipherability
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
