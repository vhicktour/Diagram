import {
  MermaidParseError,
  UnsupportedDiagramError,
  extractGraph,
} from "./extract";
import { emit } from "./emit";
import { layout } from "./layout";
import { repairMermaid } from "./repair";
import type { ConvertResult } from "./types";

export type { ConvertResult } from "./types";

const FRIENDLY_TYPE_NAMES: Record<string, string> = {
  sequence: "Sequence diagrams",
  gantt: "Gantt charts",
  pie: "Pie charts",
  journey: "User journey diagrams",
  gitGraph: "Git graphs",
  git: "Git graphs",
  timeline: "Timelines",
  quadrantChart: "Quadrant charts",
  xychart: "XY charts",
  sankey: "Sankey diagrams",
};

function unsupportedMessage(diagramType: string): string {
  const label = FRIENDLY_TYPE_NAMES[diagramType] ?? `"${diagramType}" diagrams`;
  return `${label} can't be imported as an editable diagram yet. Try a flowchart, class, state, ER, or mindmap diagram.`;
}

// Parses Mermaid text and returns editable app nodes/edges, or a typed failure
// the caller turns into a toast. Shared by the Import UI and the AI agent tool.
export async function convertMermaidToDiagram(
  text: string
): Promise<ConvertResult> {
  let graph;
  try {
    graph = await extractGraph(text);
  } catch (error) {
    // One repair attempt for the syntax slips LLMs (and pasted chat replies)
    // commonly contain; code that parsed fine never reaches this path.
    const repaired = error instanceof MermaidParseError ? repairMermaid(text) : text;
    if (repaired !== text) {
      try {
        graph = await extractGraph(repaired);
      } catch {
        // repaired version failed too — report the original error below
      }
    }
    if (!graph) {
      if (error instanceof UnsupportedDiagramError) {
        return { ok: false, reason: "unsupported", message: unsupportedMessage(error.diagramType) };
      }
      return {
        ok: false,
        reason: "parse-error",
        message: (error as Error)?.message ?? "Could not parse the Mermaid diagram.",
      };
    }
  }

  if (graph.nodes.length === 0) {
    return { ok: false, reason: "empty", message: "No nodes were found in the diagram." };
  }

  // Drop edges that point at flattened subgraph containers.
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  graph.edges = graph.edges.filter(
    (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
  );

  const token = (globalThis.crypto?.randomUUID?.() ?? String(Date.now())).slice(0, 8);
  const { nodes, edges } = emit(graph, token);
  return { ok: true, nodes: layout(nodes, edges, graph.direction), edges };
}
