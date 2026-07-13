import type { ShapeType } from "@/components/shape/types";

// Maps Mermaid shape ids to the app's shapes (src/components/shape/types).
// Covers both the unified getData() names (e.g. "squareRect") and the older
// vertex.type names (e.g. "square"), so the extractor never has to care which
// mermaid pipeline produced the value. Unknown shapes fall back to rectangle.
const SHAPE_MAP: Record<string, ShapeType> = {
  // rectangles
  squareRect: "rectangle",
  square: "rectangle",
  rect: "rectangle",
  subroutine: "rectangle",
  classBox: "rectangle",
  erBox: "rectangle",
  defaultMindmapNode: "rectangle",
  odd: "rectangle",
  // rounded
  roundedRect: "round-rectangle",
  round: "round-rectangle",
  stadium: "round-rectangle",
  mindmapRoundedRect: "round-rectangle",
  bang: "round-rectangle",
  cloud: "round-rectangle",
  // decisions
  diamond: "diamond",
  rhombus: "diamond",
  question: "diamond",
  // circles
  circle: "circle",
  doublecircle: "circle",
  mindmapCircle: "circle",
  stateStart: "circle",
  stateEnd: "circle",
  // data store
  cylinder: "cylinder",
  database: "cylinder",
  // hexagons
  hexagon: "hexagon",
  // triangles
  triangle: "triangle",
  // parallelograms / trapezoids (closest match)
  lean_right: "parallelogram",
  lean_left: "parallelogram",
  trapezoid: "parallelogram",
  inv_trapezoid: "parallelogram",
  parallelogram: "parallelogram",
};

export function toShapeType(mermaidShape?: string): ShapeType {
  if (!mermaidShape) return "rectangle";
  return SHAPE_MAP[mermaidShape] ?? "rectangle";
}
