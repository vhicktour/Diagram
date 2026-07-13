import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { LayoutDirection } from "./types";

const FALLBACK_WIDTH = 120;
const FALLBACK_HEIGHT = 80;

// Runs a directed layered layout and writes positions back onto the nodes.
// dagre reports node centers; React Flow positions are top-left, so we shift by
// half the node size.
export function layout(
  nodes: Node[],
  edges: Edge[],
  direction: LayoutDirection
): Node[] {
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 });
  graph.setDefaultEdgeLabel(() => ({}));

  for (const node of nodes) {
    graph.setNode(node.id, {
      width: Number(node.style?.width) || FALLBACK_WIDTH,
      height: Number(node.style?.height) || FALLBACK_HEIGHT,
    });
  }
  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const laidOut = graph.node(node.id);
    const width = Number(node.style?.width) || FALLBACK_WIDTH;
    const height = Number(node.style?.height) || FALLBACK_HEIGHT;
    return {
      ...node,
      position: { x: laidOut.x - width / 2, y: laidOut.y - height / 2 },
    };
  });
}
