"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import type { Node, Edge } from "vis-network";
import {
  generateBarabasiAlbertGraph,
  generateRandomGraph,
  selectNodesByDegree,
} from "../../lib/BarabasiAlbertNetwork";

// ─── Types ────────────────────────────────────────────────────────────────────

type NetworkModel = "BarabasiAlbert" | "RandomGraph";

interface NetworkConfig {
  numberOfNodes: number;
  numberOfGuardians: number;
  threshold: number;
  physicsEnabled: boolean;
  networkModel: NetworkModel;
}

// ─── NetworkSimulation class (adapted from app/src/index.ts) ──────────────────
// The rerender() method still uses document.getElementById to update label text;
// the corresponding divs are rendered by the React component below.

const COLOR_GREY = "grey";
const FDKG_AND_TALLIER = "#4CAF50";
const FDKG_COLOR = "#2196F3";
const TALLIER_COLOR = "#FF9800";

class NetworkSimulation {
  private fdkgArray: boolean[];
  private talliersArray: boolean[];
  private adjacencyList: number[][] = [];
  private degrees: number[] = [];
  private decipherabilityStatus: string[] = [];
  public nodes: Node[] = [];
  public edges: Edge[] = [];

  constructor(
    private config: NetworkConfig,
    private onRender: () => void
  ) {
    this.fdkgArray = new Array(config.numberOfNodes).fill(false);
    this.talliersArray = new Array(config.numberOfNodes).fill(false);
    this.generateDirectedGraph(config.numberOfNodes, config.numberOfGuardians);
  }

  public generateDirectedGraph(numberOfNodes: number, numberOfGuardians: number) {
    const { adjacencyList, degrees } =
      this.config.networkModel === "BarabasiAlbert"
        ? generateBarabasiAlbertGraph(numberOfNodes, numberOfGuardians)
        : generateRandomGraph(numberOfNodes, numberOfGuardians);

    this.adjacencyList = [];
    adjacencyList.forEach((guardians, nodeId) => {
      this.adjacencyList[nodeId] = Array.from(guardians);
    });
    this.degrees = degrees;

    const maxNodeSize = Math.max(...this.degrees) || 1;
    this.nodes = [];
    this.edges = [];

    for (let i = 0; i < numberOfNodes; i++) {
      const inDegree = Math.max(0, this.degrees[i] - numberOfGuardians);
      this.nodes.push({ id: i, label: `${i}`, value: inDegree, color: { background: COLOR_GREY } });
    }

    for (let from = 0; from < numberOfNodes; from++) {
      for (const to of this.adjacencyList[from]) {
        const fromSize = (this.nodes[from].value as number) || 1;
        const toSize = (this.nodes[to].value as number) || 1;
        const nf = fromSize / maxNodeSize, nt = toSize / maxNodeSize;
        const length = nf > 0.7 && nt > 0.7 ? 100
          : nf < 0.3 && nt < 0.3 ? 2000
          : 100 + 1900 * ((1 - nf) + (1 - nt)) / 2;
        this.edges.push({ from, to, length });
      }
    }
    this.onRender();
  }

  public checkDecipherability(): boolean {
    const threshold = this.config.threshold;
    if (threshold < 0) return false;
    for (let nodeId = 0; nodeId < this.degrees.length; nodeId++) {
      if (!this.fdkgArray[nodeId]) continue;
      if (this.talliersArray[nodeId]) continue;
      const guardians = this.adjacencyList[nodeId];
      let count = 0;
      for (const gId of guardians) {
        if (this.talliersArray[gId] && ++count >= threshold) break;
      }
      if (count < threshold) return false;
    }
    return true;
  }

  public selectFDKGSet(fdkgPct: number) {
    const size = Math.floor(this.degrees.length * fdkgPct);
    this.fdkgArray.fill(false);
    selectNodesByDegree(this.degrees, size).forEach(id => { this.fdkgArray[id] = true; });
    this.rerender();
  }

  public selectTalliersSet(retPct: number, newPct: number) {
    const fdkgIdx: number[] = [], nonFdkgIdx: number[] = [];
    for (let i = 0; i < this.fdkgArray.length; i++) {
      (this.fdkgArray[i] ? fdkgIdx : nonFdkgIdx).push(i);
    }
    const retSet = selectNodesByDegree(fdkgIdx.map(i => this.degrees[i]), Math.floor(fdkgIdx.length * retPct));
    const newSet = selectNodesByDegree(nonFdkgIdx.map(i => this.degrees[i]), Math.floor(nonFdkgIdx.length * newPct));
    this.talliersArray.fill(false);
    retSet.forEach(idx => { this.talliersArray[fdkgIdx[idx]] = true; });
    newSet.forEach(idx => { this.talliersArray[nonFdkgIdx[idx]] = true; });
    this.rerender();
  }

  public rerender() {
    const threshold = this.config.threshold;
    const numNodes = this.degrees.length;

    for (let nodeId = 0; nodeId < numNodes; nodeId++) {
      this.decipherabilityStatus[nodeId] = "";
      if (this.fdkgArray[nodeId]) {
        if (this.talliersArray[nodeId]) {
          this.decipherabilityStatus[nodeId] = "1/1";
        } else {
          let count = 0;
          for (const gId of this.adjacencyList[nodeId]) {
            if (this.talliersArray[gId] && ++count >= threshold) break;
          }
          this.decipherabilityStatus[nodeId] = `${count}/${threshold}`;
        }
      }
    }

    this.nodes = this.nodes.map(node => {
      const id = node.id as number;
      const color =
        this.fdkgArray[id] && this.talliersArray[id] ? FDKG_AND_TALLIER
        : this.fdkgArray[id] ? FDKG_COLOR
        : this.talliersArray[id] ? TALLIER_COLOR
        : COLOR_GREY;
      return { ...node, color: { background: color } };
    });

    const fdkgIds = this.fdkgArray.reduce<number[]>((a, v, i) => (v ? [...a, i] : a), []);
    const talliersIds = this.talliersArray.reduce<number[]>((a, v, i) => (v ? [...a, i] : a), []);

    const el = (id: string) => document.getElementById(id);
    const fdkgLabel = el("fdkgLabel");
    if (fdkgLabel) fdkgLabel.innerText = `FDKG set: ${fdkgIds.length} nodes`;
    const talliersLabel = el("talliersLabel");
    if (talliersLabel) talliersLabel.innerText = `Talliers set: ${talliersIds.length} nodes`;

    const decLabel = el("decipherabilityLabel");
    if (decLabel) {
      let content = "Decipherability per FDKG node:\n";
      for (let i = 0; i < numNodes; i++) {
        if (this.decipherabilityStatus[i]) content += `  Node ${i}: ${this.decipherabilityStatus[i]}\n`;
      }
      decLabel.innerText = content.trim();
    }

    const decResult = el("decipherabilityResult");
    if (decResult) {
      const ok = this.checkDecipherability();
      decResult.innerText = `Decipherable: ${ok ? "Yes ✓" : "No ✗"}`;
      decResult.style.color = ok ? "green" : "red";
    }

    this.onRender();
  }
}

// ─── React component ──────────────────────────────────────────────────────────

export default function SimPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);
  const simRef = useRef<NetworkSimulation | null>(null);

  const [N, setN] = useState(100);
  const [k, setK] = useState(5);
  const [t, setT] = useState(3);
  const [fdkgPct, setFdkgPct] = useState(30);
  const [retPct, setRetPct] = useState(90);
  const [physics, setPhysics] = useState(true);
  const [model, setModel] = useState<NetworkModel>("BarabasiAlbert");
  const [status, setStatus] = useState<string | null>(null);

  // Keep physics in sync without rebuilding the whole network
  useEffect(() => {
    networkRef.current?.setOptions({ physics: { enabled: physics } });
  }, [physics]);

  const renderNetwork = useCallback(async () => {
    if (!containerRef.current || !simRef.current) return;
    const { Network } = await import("vis-network");
    const { DataSet } = await import("vis-data");
    const sim = simRef.current;

    networkRef.current = new Network(
      containerRef.current,
      { nodes: new DataSet(sim.nodes), edges: new DataSet(sim.edges) },
      {
        nodes: {
          shape: "dot",
          scaling: { min: 10, max: 50, label: { min: 8, max: 20, drawThreshold: 8, maxVisible: 20 } },
        },
        edges: {
          arrows: "to",
          width: 0.1,
          color: { inherit: "from" },
          smooth: { enabled: true, type: "continuous", roundness: 0.5 },
        },
        layout: { improvedLayout: false },
        physics: {
          enabled: physics,
          forceAtlas2Based: {
            gravitationalConstant: -700,
            centralGravity: 0.3,
            springLength: 200,
            springConstant: 0.05,
          },
          solver: "forceAtlas2Based",
          maxVelocity: 300,
          timestep: 0.35,
          stabilization: { iterations: 10 },
        },
      }
    );
  }, [physics]);

  const handleGenerate = () => {
    setStatus("Generating…");
    // defer to next tick so the status text renders before the heavy computation
    setTimeout(() => {
      simRef.current = new NetworkSimulation(
        { numberOfNodes: N, numberOfGuardians: k, threshold: t, physicsEnabled: physics, networkModel: model },
        renderNetwork
      );
      setStatus(null);
    }, 0);
  };

  const handleSelectFDKG = () => {
    simRef.current?.selectFDKGSet(fdkgPct / 100);
  };

  const handleSelectTalliers = () => {
    simRef.current?.selectTalliersSet(retPct / 100, 0.05);
  };

  const handleCheckDecipherability = () => {
    if (!simRef.current) return;
    simRef.current.rerender(); // triggers full label + colour update
  };

  const rowStyle: React.CSSProperties = { display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" };
  const labelStyle: React.CSSProperties = { width: 280, flexShrink: 0 };

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>FDKG Network Simulator</h2>
      <p style={{ color: "#666", fontSize: "0.85rem" }}>
        Visualise Barabasi-Albert and Random graph models, select FDKG and Tallier sets by degree,
        and check decipherability (each offline tallier's key is reconstructable by ≥ t online guardians).
      </p>

      {/* Controls */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={rowStyle}>
          <label style={labelStyle}>Nodes (N): <strong>{N}</strong></label>
          <input type="range" min={5} max={500} value={N} onChange={e => setN(+e.target.value)} style={{ flex: 1 }} />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Guardians per node (k): <strong>{k}</strong></label>
          <input type="range" min={1} max={20} value={k} onChange={e => setK(+e.target.value)} style={{ flex: 1 }} />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Reconstruction threshold (t): <strong>{t}</strong></label>
          <input type="range" min={1} max={20} value={t} onChange={e => setT(+e.target.value)} style={{ flex: 1 }} />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>FDKG participation %: <strong>{fdkgPct}%</strong></label>
          <input type="range" min={0} max={100} value={fdkgPct} onChange={e => setFdkgPct(+e.target.value)} style={{ flex: 1 }} />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Tallier retention %: <strong>{retPct}%</strong></label>
          <input type="range" min={10} max={100} value={retPct} onChange={e => setRetPct(+e.target.value)} style={{ flex: 1 }} />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Physics:</label>
          <input type="checkbox" checked={physics} onChange={e => setPhysics(e.target.checked)} />
        </div>
        <div style={rowStyle}>
          <label style={labelStyle}>Graph model:</label>
          <select value={model} onChange={e => setModel(e.target.value as NetworkModel)}>
            <option value="BarabasiAlbert">Barabasi-Albert</option>
            <option value="RandomGraph">Random Graph</option>
          </select>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <button onClick={handleGenerate}>1. Generate Graph</button>
        <button onClick={handleSelectFDKG}>2. Select FDKG Set</button>
        <button onClick={handleSelectTalliers}>3. Select Talliers Set</button>
        <button onClick={handleCheckDecipherability}>4. Check Decipherability</button>
      </div>

      {status && <div style={{ marginBottom: "0.5rem", color: "#888" }}>{status}</div>}

      {/* Status labels — IDs used by NetworkSimulation.rerender() */}
      <div style={{ display: "flex", gap: "2rem", marginBottom: "0.5rem", fontSize: "0.85rem" }}>
        <div id="decipherabilityResult" style={{ fontWeight: "bold" }}>Decipherable: —</div>
        <div id="fdkgLabel">FDKG set: —</div>
        <div id="talliersLabel">Talliers set: —</div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: "1.5rem", fontSize: "0.78rem", marginBottom: "0.75rem" }}>
        {[
          { color: FDKG_COLOR, label: "FDKG only" },
          { color: TALLIER_COLOR, label: "Tallier only" },
          { color: FDKG_AND_TALLIER, label: "FDKG + Tallier" },
          { color: COLOR_GREY, label: "Inactive" },
        ].map(({ color, label }) => (
          <span key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: color }} />
            {label}
          </span>
        ))}
      </div>

      {/* Graph canvas */}
      <div
        ref={containerRef}
        style={{ width: "100%", height: 560, border: "1px solid #ccc", borderRadius: 4, background: "#fafafa" }}
      />

      {/* Per-node decipherability status */}
      <pre
        id="decipherabilityLabel"
        style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#555", maxHeight: 120, overflowY: "auto" }}
      >
        Decipherability Status: run steps 1–4 above
      </pre>
    </div>
  );
}
