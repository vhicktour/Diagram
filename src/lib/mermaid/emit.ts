import type { Edge, Node } from "@xyflow/react";
import type { IntermediateGraph } from "./types";
import { toShapeType } from "./shapeMap";

// Default node color matches useDiagram.onDrop (src/hooks/useDiagram.tsx).
const DEFAULT_COLOR = "#3F8AE2";

// Rough initial sizing from the label; React Flow re-measures once rendered,
// but dagre needs sizes up front and multi-line class/ER nodes need room.
function nodeSize(label: string): { width: number; height: number } {
  const lines = label.split("\n");
  const longest = Math.max(1, ...lines.map((line) => line.length));
  return {
    width: Math.min(320, Math.max(120, longest * 8 + 32)),
    height: Math.min(400, Math.max(60, lines.length * 22 + 28)),
  };
}

// Maps the intermediate graph to the app's node/edge format. Ids are namespaced
// with a per-import token so repeated imports (or overlap with existing canvas
// ids) never collide. Positions are placeholders; layout() fills them in.
export function emit(
  graph: IntermediateGraph,
  token: string
): { nodes: Node[]; edges: Edge[] } {
  const [sourceHandle, targetHandle] =
    graph.direction === "LR" ? ["right", "left"] : ["bottom", "top"];
  const idOf = (mermaidId: string) => `${token}-${mermaidId}`;

  const nodes: Node[] = graph.nodes.map((node) => ({
    id: idOf(node.id),
    type: "shape",
    position: { x: 0, y: 0 },
    style: nodeSize(node.label),
    data: {
      type: toShapeType(node.shape),
      color: DEFAULT_COLOR,
      contents: node.label,
      icon: "",
    },
    selected: true,
  }));

  const edges: Edge[] = graph.edges.map((edge, index) => ({
    id: `${token}-e${index}-${edge.source}-${edge.target}`,
    source: idOf(edge.source),
    target: idOf(edge.target),
    sourceHandle,
    targetHandle,
    type: "editable-edge",
    style: { strokeWidth: 2 },
    ...(edge.label ? { data: { title: edge.label } } : {}),
  }));

  return { nodes, edges };
}
