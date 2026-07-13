// Fixes the Mermaid syntax slips LLMs commonly make, so an almost-right
// generation still renders. Only used as a fallback after a parse failure —
// hand-written code that parses is never touched.
export function repairMermaid(text: string): string {
  let out = text.trim();

  // strip ```mermaid ... ``` code fences
  out = out.replace(/^```(?:mermaid)?\s*\n?/i, "").replace(/\n?```\s*$/, "");

  // strip a bare "mermaid" header line
  out = out.replace(/^mermaid\s*\n/i, "");

  // smart quotes → straight quotes
  out = out.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  // `-->|label|> B` — stray ">" after the closing label pipe
  out = out.replace(/\|>(?=\s|\w)/g, "|");

  return out;
}
