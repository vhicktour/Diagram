"use client";

import { useReactFlow, type Edge, type Node } from "@xyflow/react";
import { ShapeComponents, type ShapeType } from "@/components/shape/types";
import type { useDiagram } from "@/hooks/useDiagram";
import type { LayoutDirection } from "@/lib/mermaid/types";

const DEFAULT_COLOR = "#3F8AE2";

function asShapeType(value: unknown): ShapeType {
  return typeof value === "string" && value in ShapeComponents
    ? (value as ShapeType)
    : "rectangle";
}

const str = (value: unknown, fallback = "") =>
  value === undefined || value === null ? fallback : String(value);

const newId = () => `ai-${globalThis.crypto.randomUUID().slice(0, 8)}`;

type ToolInput = Record<string, unknown>;

// Executes the AI assistant's tool calls against the live canvas. Node/edge ops
// go through React Flow's store; undo uses the diagram's own takeSnapshot so AI
// edits are reversible with the main Undo button.
export function useDiagramTools(diagram: ReturnType<typeof useDiagram>) {
  const { getNodes, getEdges, setNodes, setEdges } = useReactFlow();
  const { takeSnapshot } = diagram;

  const runTool = async (name: string, input: ToolInput): Promise<unknown> => {
    switch (name) {
      case "get_diagram":
        return {
          nodes: getNodes().map((node) => ({
            id: node.id,
            label: (node.data as { contents?: string })?.contents ?? "",
            shape: (node.data as { type?: string })?.type,
            color: (node.data as { color?: string })?.color,
          })),
          edges: getEdges().map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: (edge.data as { title?: string })?.title ?? "",
          })),
        };

      case "apply_mermaid": {
        const result = await diagram.importMermaid(str(input.code));
        return result.ok
          ? { added: result.nodes.length }
          : {
              error: result.message,
              hint: "Fix the Mermaid code yourself and call apply_mermaid again. Do not ask the user about syntax.",
            };
      }

      case "add_node": {
        takeSnapshot();
        const count = getNodes().length;
        const node: Node = {
          id: newId(),
          type: "shape",
          position: { x: (count % 5) * 180, y: Math.floor(count / 5) * 140 },
          style: { width: 120, height: 80 },
          data: {
            type: asShapeType(input.shape),
            color: typeof input.color === "string" ? input.color : DEFAULT_COLOR,
            contents: str(input.label),
            icon: "",
          },
          selected: false,
        };
        setNodes((nodes) => [...nodes, node]);
        return { id: node.id };
      }

      case "update_node": {
        const id = str(input.id);
        let found = false;
        takeSnapshot();
        setNodes((nodes) =>
          nodes.map((node) => {
            if (node.id !== id) return node;
            found = true;
            const data = { ...(node.data as Record<string, unknown>) };
            if (input.label !== undefined) data.contents = str(input.label);
            if (input.color !== undefined) data.color = str(input.color);
            if (input.shape !== undefined) data.type = asShapeType(input.shape);
            return { ...node, data };
          })
        );
        return found ? { updated: id } : { error: `No node with id ${id}` };
      }

      case "connect_nodes": {
        takeSnapshot();
        const source = str(input.source);
        const target = str(input.target);
        const edge: Edge = {
          id: newId(),
          source,
          target,
          sourceHandle: "bottom",
          targetHandle: "top",
          type: "editable-edge",
          style: { strokeWidth: 2 },
          ...(input.label ? { data: { title: str(input.label) } } : {}),
        };
        setEdges((edges) => [...edges, edge]);
        return { connected: `${source} -> ${target}` };
      }

      case "delete_elements": {
        takeSnapshot();
        const nodeIds = new Set(
          Array.isArray(input.nodeIds) ? input.nodeIds.map(String) : []
        );
        const edgeIds = new Set(
          Array.isArray(input.edgeIds) ? input.edgeIds.map(String) : []
        );
        if (nodeIds.size) setNodes((nodes) => nodes.filter((node) => !nodeIds.has(node.id)));
        setEdges((edges) =>
          edges.filter(
            (edge) =>
              !edgeIds.has(edge.id) &&
              !nodeIds.has(edge.source) &&
              !nodeIds.has(edge.target)
          )
        );
        return { deletedNodes: nodeIds.size, deletedEdges: edgeIds.size };
      }

      case "auto_layout": {
        const { layout } = await import("@/lib/mermaid/layout");
        takeSnapshot();
        const direction: LayoutDirection = input.direction === "LR" ? "LR" : "TB";
        const laidOut = layout(getNodes(), getEdges(), direction);
        setNodes(laidOut);
        return { laidOut: laidOut.length };
      }

      case "clear_canvas":
        diagram.clearDiagram();
        return { cleared: true };

      default:
        return { error: `Unknown tool: ${name}` };
    }
  };

  return { runTool };
}
