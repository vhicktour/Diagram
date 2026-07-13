import type { Edge, Node } from "@xyflow/react";

export type LayoutDirection = "TB" | "LR";

// A minimal, diagram-type-agnostic graph. Every supported Mermaid type is
// reduced to this before it is mapped to the app's node/edge format.
export type IntermediateNode = {
  id: string;
  label: string;
  shape?: string; // raw Mermaid shape id (e.g. "diamond", "cylinder")
};

export type IntermediateEdge = {
  source: string;
  target: string;
  label?: string;
};

export type IntermediateGraph = {
  nodes: IntermediateNode[];
  edges: IntermediateEdge[];
  direction: LayoutDirection;
};

export type ConvertResult =
  | { ok: true; nodes: Node[]; edges: Edge[] }
  | { ok: false; reason: "unsupported" | "parse-error" | "empty"; message: string };
