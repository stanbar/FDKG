export function generateBarabasiAlbertGraph(numberOfNodes: number, numberOfGuardians: number) {
  const edges: Array<[number, number]> = [];
  const degrees = new Array<number>(numberOfNodes).fill(0);
  const degreeList: number[] = [];

  // Initialize the initial fully connected network
  for (let i = 0; i < numberOfGuardians; i++) {
      for (let j = 0; j < numberOfGuardians; j++) {
          if (i !== j) {
              edges.push([i, j]);
              degrees[i]++; // Out-degree
              degrees[j]++; // In-degree
              degreeList.push(i);
              degreeList.push(j);
          }
      }
  }

  // Adding new nodes
  for (let newNode = numberOfGuardians; newNode < numberOfNodes; newNode++) {
      const targets = new Set<number>();

      while (targets.size < numberOfGuardians) {
          const randomIndex = Math.floor(Math.random() * degreeList.length);
          const targetNode = degreeList[randomIndex];

          if (targetNode !== newNode && !targets.has(targetNode)) {
              targets.add(targetNode);
              edges.push([newNode, targetNode]);
              degrees[newNode]++;
              degrees[targetNode]++;
              degreeList.push(newNode);
              degreeList.push(targetNode);
          }
      }
  }

  return { adjacencyList: buildAdjacencyList(edges, numberOfNodes), degrees };
}

export function generateRandomGraph(numberOfNodes: number, numberOfGuardians: number) {
  const edges: Array<[number, number]> = [];
  const degrees = new Array<number>(numberOfNodes).fill(0);

  // Iterate over all possible pairs of nodes
  for (let i = 0; i < numberOfNodes; i++) {
    // Ensure that node i is connected to at least numberOfGuardians nodes
    const connections = new Set<number>();
    while (connections.size < numberOfGuardians) {
      const j = Math.floor(Math.random() * numberOfNodes);
      if (j !== i && !connections.has(j)) {
        connections.add(j);
        edges.push([i, j]);
        edges.push([j, i]);
        degrees[i]++;
        degrees[j]++;
      }
    }
  }

  return { adjacencyList: buildAdjacencyList(edges, numberOfNodes), degrees };
}

function buildAdjacencyList(edges: Array<[number, number]>, numberOfNodes: number) {
  const adjacencyList = new Map<number, Set<number>>();
  for (let i = 0; i < numberOfNodes; i++) {
      adjacencyList.set(i, new Set<number>());
  }
  for (const [source, target] of edges) {
      adjacencyList.get(source)!.add(target);
  }
  return adjacencyList;
}



export function selectNodesByDegree(degrees: number[], numberOfNodesToSelect: number): Set<number> {
  const N = degrees.length;

  // Compute total degree and cumulative degrees
  const cumulativeDegrees = new Array<number>(N);
  let totalDegree = 0;

  for (let i = 0; i < N; i++) {
      totalDegree += degrees[i];
      cumulativeDegrees[i] = totalDegree;
  }

  const selectedNodes = new Set<number>();

  for (let k = 0; k < numberOfNodesToSelect; k++) {
      const rand = Math.random() * totalDegree;

      // Binary search to find the node corresponding to rand
      let left = 0;
      let right = N - 1;
      let selectedNode = -1;

      while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          if (rand < cumulativeDegrees[mid]) {
              if (mid === 0 || rand >= cumulativeDegrees[mid - 1]) {
                  selectedNode = mid;
                  break;
              } else {
                  right = mid - 1;
              }
          } else {
              left = mid + 1;
          }
      }

      // Handle edge cases
      if (selectedNode === -1) {
          selectedNode = N - 1;
      }

      // If you want unique nodes, uncomment the following lines
      if (!selectedNodes.has(selectedNode)) {
          selectedNodes.add(selectedNode);
      } else {
          k--; // Retry if duplicate
      }
      // If duplicates are acceptable, use:
      // selectedNodes.add(selectedNode);
  }

  return selectedNodes;
}

// Example usage:
const numberOfNodes = 1_000_000; // 1 million nodes
const numberOfGuardians = 4;
const numberOfNodesToSelect = numberOfNodes * 0.2;
const { adjacencyList, degrees } = generateBarabasiAlbertGraph(numberOfNodes, numberOfGuardians);

const zeroDegreeNodes = degrees.filter((deg) => deg === 0).length;
console.log(`Number of nodes with degree zero: ${zeroDegreeNodes}`);

// Since printing the entire graph is impractical, you might want to check specific properties
console.log(`Generated a BA graph with ${numberOfNodes} nodes and ${adjacencyList.size} adjacency entries.`);
// Select nodes based on degree
const selectedNodes = selectNodesByDegree(degrees, numberOfNodesToSelect);
const selectedNodesArray = Array.from(selectedNodes);

// Output selected nodes
console.log(`Selected ${selectedNodesArray.length} nodes based on degree.`);

// If you want to see a sample of selected nodes
console.log('Sample selected nodes:', selectedNodesArray.slice(0, 10));

// Compute average degree of all nodes
const averageDegreeAll = degrees.reduce((sum, deg) => sum + deg, 0) / numberOfNodes;

// Compute average degree of selected nodes
const averageDegreeSelected = selectedNodesArray.reduce((sum, nodeId) => sum + degrees[nodeId], 0) / selectedNodesArray.length;

console.log(`Average degree of all nodes: ${averageDegreeAll.toFixed(2)}`);
console.log(`Average degree of selected nodes: ${averageDegreeSelected.toFixed(2)}`);
