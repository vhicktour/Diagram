import { z } from "zod";

// Shared tool contract for the AI assistant. Zod-only (no `ai` import) so both
// the server route (which wraps these with `tool()`) and the client executor
// (which reads the inferred input types) can import it. The tools have NO
// server-side `execute` — they run in the browser against the live canvas.
export const toolDefinitions = {
  get_diagram: {
    description:
      "List the current diagram: every node (id, label, shape, color) and every edge (id, source, target, label). Call this before editing existing nodes so you use the correct ids.",
    inputSchema: z.object({}),
  },
  apply_mermaid: {
    description:
      "Create a whole diagram from Mermaid code and add it to the canvas as editable shapes. Supports flowchart, classDiagram, stateDiagram, erDiagram, and mindmap. Prefer this when building a diagram from scratch or from an uploaded image. In flowcharts, choose node shapes that fit each step instead of using rectangles for everything: decisions/conditions as A{Text} (diamond), start and end as A((Text)) (circle) or A([Text]) (rounded), databases/storage as A[(Text)] (cylinder), and plain steps as A[Text]. Write valid Mermaid: labeled edges are A -->|label| B (no extra characters after the closing pipe).",
    inputSchema: z.object({
      code: z.string().describe("Valid Mermaid diagram source"),
    }),
  },
  add_node: {
    description: "Add one shape node to the canvas. Returns the new node id.",
    inputSchema: z.object({
      label: z.string().describe("Text shown inside the node"),
      shape: z
        .string()
        .optional()
        .describe(
          "One of: rectangle, round-rectangle, circle, diamond, hexagon, cylinder, triangle, parallelogram, arrow-rectangle, plus. Defaults to rectangle."
        ),
      color: z.string().optional().describe("Hex color, e.g. #3F8AE2"),
    }),
  },
  update_node: {
    description:
      "Update an existing node's label, shape, and/or color. Use get_diagram first to find the id.",
    inputSchema: z.object({
      id: z.string(),
      label: z.string().optional(),
      shape: z.string().optional(),
      color: z.string().optional(),
    }),
  },
  connect_nodes: {
    description: "Draw an edge from one node to another, optionally labeled.",
    inputSchema: z.object({
      source: z.string().describe("Source node id"),
      target: z.string().describe("Target node id"),
      label: z.string().optional(),
    }),
  },
  delete_elements: {
    description: "Delete nodes and/or edges by id.",
    inputSchema: z.object({
      nodeIds: z.array(z.string()).optional(),
      edgeIds: z.array(z.string()).optional(),
    }),
  },
  auto_layout: {
    description:
      "Tidy the whole diagram with an automatic top-to-bottom (TB) or left-to-right (LR) layout.",
    inputSchema: z.object({
      direction: z.enum(["TB", "LR"]).optional(),
    }),
  },
  clear_canvas: {
    description:
      "Remove every node and edge, leaving an empty canvas. Use when the user asks to start over or clear the diagram.",
    inputSchema: z.object({}),
  },
} as const;

export type ToolName = keyof typeof toolDefinitions;

export const SYSTEM_PROMPT = `You are DiagramX's diagramming assistant. The user has a canvas of shapes connected by edges, and you help them build and edit it with tools.

When NOT to use tools:
- For greetings, thanks, or general questions, just reply in one or two short sentences. Do NOT call any tool.
- Never write a tool name, its JSON, or its arguments in your text reply. Call the tool, then say in one short sentence what you did.

Creating a diagram:
- When the user asks you to draw or create a diagram (from a description or an uploaded image), write Mermaid and call apply_mermaid. This REPLACES the whole canvas with the new diagram. Supported: flowchart, classDiagram, stateDiagram, erDiagram, mindmap.

Editing the existing diagram:
- First call get_diagram to see the current node ids and labels. Only use ids that get_diagram or add_node returned — never guess or invent an id.
- Then use add_node, update_node, connect_nodes, delete_elements, or auto_layout. Keep labels short, and call auto_layout to tidy up after several edits.
- Use clear_canvas when the user wants to start over.

Recovering from errors:
- If a tool returns an error, fix your input yourself and call the tool again (up to 3 attempts). Never apologize for tool errors, never show the error or code in your reply, and never ask the user to fix syntax.
- If the request is vague (e.g. "a simple system design"), make reasonable assumptions and draw something sensible — do not ask for clarification first.
- Reference — this is valid flowchart syntax: graph TD; U([User]) --> G[API Gateway]; G -->|route| S[Auth Service]; S --> Q{Valid?}; Q -->|yes| D[(Database)]`;
