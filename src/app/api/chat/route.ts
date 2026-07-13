import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { SYSTEM_PROMPT, toolDefinitions } from "@/lib/agent/tools";

// The NVIDIA key is read here, server-side only, and never sent to the browser.
export const maxDuration = 60;

const MODEL = process.env.NVIDIA_AI_MODEL || "meta/llama-3.1-70b-instruct";
const MAX_MESSAGES = 50;

const nvidia = createOpenAICompatible({
  name: "nvidia",
  baseURL: process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY ?? "",
});

// Tools have no server-side `execute`: the model's tool calls are streamed to
// the browser, which runs them against the live React Flow canvas. Listed
// explicitly (not mapped) so each tool keeps its own inferred input type.
const tools = {
  get_diagram: tool(toolDefinitions.get_diagram),
  apply_mermaid: tool(toolDefinitions.apply_mermaid),
  add_node: tool(toolDefinitions.add_node),
  update_node: tool(toolDefinitions.update_node),
  connect_nodes: tool(toolDefinitions.connect_nodes),
  delete_elements: tool(toolDefinitions.delete_elements),
  auto_layout: tool(toolDefinitions.auto_layout),
};

export async function POST(req: Request) {
  if (!process.env.NVIDIA_API_KEY) {
    return Response.json(
      { error: "NVIDIA_API_KEY is not set. Add it to .env.local (see .env.example)." },
      { status: 500 }
    );
  }

  let messages: UIMessage[];
  try {
    ({ messages } = await req.json());
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) {
    return Response.json({ error: "Unexpected message list." }, { status: 400 });
  }

  const result = streamText({
    model: nvidia(MODEL),
    system: SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    stopWhen: stepCountIs(8),
    tools,
  });

  return result.toUIMessageStreamResponse();
}
