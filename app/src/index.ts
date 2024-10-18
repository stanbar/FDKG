import { Network, Node, Edge } from 'vis-network';
import { DataSet } from 'vis-data';
import * as d3 from 'd3';

let network: Network;
let nodesDataset: DataSet<Node>;
const fdkgSet: Set<number> = new Set();
const talliersSet: Set<number> = new Set();

// Color constants
const COLOR_GREY = 'grey';
const COLOR_YELLOW = 'yellow';
const COLOR_GREEN = '#4D7A3A';
const COLOR_BLUE = '#0000EC';

function generateDirectedGraph(N: number, k: number, t: number) {
    // Generate nodes with trustworthiness values from normal distribution
    const nodes: Node[] = [];
    const mean = t;
    const stdDev = t * 1.5;
    const normalDist = d3.randomNormal(mean, stdDev);
    
    for (let i = 0; i < N; i++) {
        const trustworthiness = Math.max(0, normalDist()); // Ensure non-negative trustworthiness
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
        const potentialGuardians = nodes.filter(node => node.id !== i);
        const guardians = selectGuardians(potentialGuardians, k);
        guardians.forEach(guardian => {
            edges.push({ from: i, to: guardian.id });
        });
    }

    // Create a container for visualization
    const container = document.getElementById('mynetwork');
    if (!container) {
        throw new Error('Container element not found');
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
function selectGuardians(potentialGuardians: Node[], k: number): Node[] {
    const selectedGuardians: Node[] = [];
    while (selectedGuardians.length < k) {
        const guardian = weightedRandomSelect(potentialGuardians);
        if (!selectedGuardians.includes(guardian)) {
            selectedGuardians.push(guardian);
        }
    }
    return selectedGuardians;
}

// Helper function to perform weighted random selection based on trustworthiness
function weightedRandomSelect(nodes: Node[]): Node {
    const totalWeight = nodes.reduce((sum, node) => sum + node.value!, 0);
    const threshold = Math.random() * totalWeight;
    let cumulativeWeight = 0;
    for (const node of nodes) {
        cumulativeWeight += node.value!;
        if (cumulativeWeight >= threshold) {
            return node;
        }
    }
    return nodes[nodes.length - 1]; // Fallback to the last node
}

// Helper function to select volunteers based on trustworthiness
function selectFDKGSet(numVolunteers: number) {
    // Clear the existing FDKG set
    fdkgSet.clear();

    // Get all nodes and determine new volunteer selection
    const nodes = nodesDataset.get();
    const updatedNodes: Node[] = [];
    const volunteerDist = d3.randomNormal(numVolunteers, numVolunteers * 0.5);
    numVolunteers = Math.max(1, Math.min(nodes.length, Math.round(volunteerDist()))); // Ensure valid number of volunteers

    while (fdkgSet.size < numVolunteers) {
        const volunteer = weightedRandomSelect(nodes);
        fdkgSet.add(volunteer.id);
    }

    // Update all nodes in a single update call, ensuring previous volunteers are deselected
    nodes.forEach(node => {
        updatedNodes.push({
            ...node,
            color: { background: fdkgSet.has(node.id) ? COLOR_YELLOW : COLOR_GREY },
        });
    });

    nodesDataset.update(updatedNodes);
}

// Helper function to select another subset based on trustworthiness
function selectTalliers(numVolunteers: number) {
    // Clear the existing Talliers set
    talliersSet.clear();

    // Get all nodes and determine new volunteer selection
    const nodes = nodesDataset.get();
    const updatedNodes: Node[] = [];
    const volunteerDist = d3.randomNormal(numVolunteers, numVolunteers * 0.5);
    numVolunteers = Math.max(1, Math.min(nodes.length, Math.round(volunteerDist()))); // Ensure valid number of volunteers

    while (talliersSet.size < numVolunteers) {
        const volunteer = weightedRandomSelect(nodes);
        talliersSet.add(volunteer.id);
    }

    // Update all nodes in a single update call, ensuring correct color updates
    nodes.forEach(node => {
        let newColor = COLOR_GREY;
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

function updateLabels() {
    const fdkgLabel = document.getElementById('fdkgLabel');
    const talliersLabel = document.getElementById('talliersLabel');
    if (fdkgLabel) {
        fdkgLabel.innerText = `FDKG set size: ${fdkgSet.size}`;
    }
    if (talliersLabel) {
        talliersLabel.innerText = `Talliers set size: ${talliersSet.size}`;
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
    const volunteerButton = document.getElementById('volunteerButton');
    const secondSubsetButton = document.getElementById('secondSubsetButton');
    const nodeSlider = document.getElementById('nodeSlider') as HTMLInputElement;
    const guardianSlider = document.getElementById('guardianSlider') as HTMLInputElement;
    const trustSlider = document.getElementById('trustSlider') as HTMLInputElement;
    const physicsSwitch = document.getElementById('physicsSwitch') as HTMLInputElement;

    generateButton?.addEventListener('click', () => {
        const N = parseInt(nodeSlider.value, 10);
        const k = parseInt(guardianSlider.value, 10);
        const t = parseInt(trustSlider.value, 10);
        generateDirectedGraph(N, k, t);
        updateLabels();
    });

    volunteerButton?.addEventListener('click', () => {
        const k = parseInt(trustSlider.value, 10);
        selectFDKGSet(k);
        updateLabels();
    });

    secondSubsetButton?.addEventListener('click', () => {
        const k = parseInt(trustSlider.value, 10);
        selectTalliers(k);
        updateLabels();
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
