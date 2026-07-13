import { describe, expect, it } from "vitest";
import { convertMermaidToDiagram } from ".";

// Guards the internal-mermaid-API extraction: a mermaid upgrade that changes
// getData()'s shape should fail here rather than silently in the app.

const data = (node: { data: unknown }) =>
  node.data as { type: string; color: string; contents: string; icon: string };

describe("convertMermaidToDiagram", () => {
  it("converts a flowchart to editable shape nodes and edges", async () => {
    const result = await convertMermaidToDiagram(
      "graph TD; A[Start]-->B{OK?}; B-->|yes|C((Done)); B-->|no|A;"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.nodes).toHaveLength(3);
    expect(result.edges).toHaveLength(3);

    for (const node of result.nodes) {
      expect(node.type).toBe("shape");
      expect(typeof data(node).contents).toBe("string");
      expect(data(node).icon).toBe("");
    }

    const byLabel = (label: string) =>
      result.nodes.find((node) => data(node).contents === label)!;
    expect(data(byLabel("Start")).type).toBe("rectangle");
    expect(data(byLabel("OK?")).type).toBe("diamond");
    expect(data(byLabel("Done")).type).toBe("circle");

    const yes = result.edges.find((edge) => (edge.data as any)?.title === "yes");
    expect(yes?.type).toBe("editable-edge");

    // layout assigned real positions
    expect(result.nodes.some((node) => node.position.x !== 0 || node.position.y !== 0)).toBe(true);
    // ids are unique and namespaced
    expect(new Set(result.nodes.map((n) => n.id)).size).toBe(result.nodes.length);
  });

  it("packs class members and methods into the node label", async () => {
    const result = await convertMermaidToDiagram(
      "classDiagram\n class Animal {\n +int age\n +isMammal() bool\n }\n class Dog\n Animal <|-- Dog"
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const animal = result.nodes.find((node) => data(node).contents.startsWith("Animal"))!;
    expect(data(animal).contents).toContain("age");
    expect(data(animal).contents).toContain("isMammal");
  });

  it("rejects non-graph diagram types with a friendly message", async () => {
    const result = await convertMermaidToDiagram("sequenceDiagram\n Alice->>John: Hi");

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("unsupported");
    expect(result.message).toMatch(/sequence/i);
  });

  it("reports failure for invalid syntax", async () => {
    const result = await convertMermaidToDiagram("%%% definitely not a diagram %%%");
    expect(result.ok).toBe(false);
  });
});
