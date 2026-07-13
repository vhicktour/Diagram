import type { IntermediateEdge, IntermediateGraph, IntermediateNode } from "./types";

// Everything that touches Mermaid's internal, non-semver-stable API lives in
// this file, behind the IntermediateGraph type. If a mermaid upgrade changes
// the shape of getData(), only this file (and its tests) should need to move.

// Mermaid diagram types that reduce cleanly to nodes + edges. Non-graph types
// (sequence, gantt, pie, journey, gitGraph, ...) are rejected as unsupported.
const SUPPORTED_TYPES = new Set([
  "flowchart",
  "flowchart-v2",
  "graph",
  "class",
  "classDiagram",
  "state",
  "stateDiagram",
  "stateDiagram-v2",
  "er",
  "erDiagram",
  "mindmap",
]);

export class UnsupportedDiagramError extends Error {
  constructor(public readonly diagramType: string) {
    super(`Unsupported diagram type: ${diagramType}`);
    this.name = "UnsupportedDiagramError";
  }
}

export class MermaidParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MermaidParseError";
  }
}

let initialized = false;

async function getMermaid() {
  const mermaid = (await import("mermaid")).default;
  if (!initialized) {
    mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });
    initialized = true;
  }
  return mermaid;
}

// Mermaid escapes visibility markers in member text (e.g. "\+name"); undo that
// and trim so labels read naturally.
function cleanText(value?: string): string {
  if (!value) return "";
  return value.replace(/\\([+\-#~])/g, "$1").trim();
}

// Class members/methods and ER attributes are folded into the node's multi-line
// label, since the app has a single text surface per node.
function buildLabel(node: any): string {
  const lines = [cleanText(node.label ?? node.text ?? node.id)];

  for (const member of [...(node.members ?? []), ...(node.methods ?? [])]) {
    const text = cleanText(member?.text ?? member?.id);
    if (text) lines.push(text);
  }

  for (const attr of node.attributes ?? []) {
    const keys = attr?.keys?.length ? ` ${attr.keys.join(",")}` : "";
    const text = `${attr?.type ?? ""} ${attr?.name ?? ""}${keys}`.trim();
    if (text) lines.push(text);
  }

  return lines.filter(Boolean).join("\n");
}

export async function extractGraph(text: string): Promise<IntermediateGraph> {
  const mermaid = await getMermaid();

  let parsed: false | { diagramType: string };
  try {
    parsed = await mermaid.parse(text);
  } catch (error: any) {
    throw new MermaidParseError(error?.message ?? "Invalid Mermaid syntax.");
  }
  if (!parsed) {
    throw new MermaidParseError("Invalid Mermaid syntax.");
  }
  if (!SUPPORTED_TYPES.has(parsed.diagramType)) {
    throw new UnsupportedDiagramError(parsed.diagramType);
  }

  const diagram = await mermaid.mermaidAPI.getDiagramFromText(text);
  const db: any = (diagram as any).db;
  // The unified data pipeline is what makes a diagram graph-like; its absence
  // means the type can't be reduced to nodes/edges.
  if (typeof db?.getData !== "function") {
    throw new UnsupportedDiagramError(parsed.diagramType);
  }

  const data = db.getData();

  const nodes: IntermediateNode[] = (data.nodes ?? [])
    .filter((node: any) => !node.isGroup) // subgraph containers are flattened away
    .map((node: any) => ({
      id: String(node.id),
      label: buildLabel(node),
      shape: node.shape,
    }));

  const edges: IntermediateEdge[] = (data.edges ?? []).map((edge: any) => ({
    source: String(edge.start),
    target: String(edge.end),
    label: cleanText(edge.label),
  }));

  const direction = data.direction === "LR" || data.direction === "RL" ? "LR" : "TB";

  return { nodes, edges, direction };
}
