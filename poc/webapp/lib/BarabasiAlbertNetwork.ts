// Ported from app/src/BarabasiAlbertNetwork.ts — example run stripped.

export function generateBarabasiAlbertGraph(numberOfNodes: number, numberOfGuardians: number) {
  const edges: Array<[number, number]> = [];
  const degrees = new Array<number>(numberOfNodes).fill(0);
  const degreeList: number[] = [];

  for (let i = 0; i < numberOfGuardians; i++) {
    for (let j = 0; j < numberOfGuardians; j++) {
      if (i !== j) {
        edges.push([i, j]);
        degrees[i]++;
        degrees[j]++;
        degreeList.push(i);
        degreeList.push(j);
      }
    }
  }

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

  for (let i = 0; i < numberOfNodes; i++) {
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
  const cumulativeDegrees = new Array<number>(N);
  let totalDegree = 0;
  for (let i = 0; i < N; i++) {
    totalDegree += degrees[i];
    cumulativeDegrees[i] = totalDegree;
  }

  const selectedNodes = new Set<number>();
  for (let k = 0; k < numberOfNodesToSelect; k++) {
    const rand = Math.random() * totalDegree;
    let left = 0, right = N - 1, selectedNode = -1;
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (rand < cumulativeDegrees[mid]) {
        if (mid === 0 || rand >= cumulativeDegrees[mid - 1]) { selectedNode = mid; break; }
        else right = mid - 1;
      } else {
        left = mid + 1;
      }
    }
    if (selectedNode === -1) selectedNode = N - 1;
    if (!selectedNodes.has(selectedNode)) selectedNodes.add(selectedNode);
    else k--;
  }
  return selectedNodes;
}
