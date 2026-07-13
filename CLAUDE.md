# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

DiagramX (package name `lifecycle-diagram-maker`) is a single-page, client-side diagram editor built on React Flow (`@xyflow/react` v12). Users drag shapes onto a canvas, connect them with editable curved edges, and export the result as PNG, animated SVG, or source-control-friendly JSON. There is no backend — everything runs in the browser.

## Commands

```bash
npm run dev      # dev server on http://localhost:3000 (webpack, not Turbopack)
npm run build    # production build
npm run start    # serve the production build
npm run kill     # kill whatever holds port 3000 (kill -9 $(lsof -ti:3000))
```

- **`--webpack` is mandatory** on `dev`/`build`. The build depends on `monaco-editor-webpack-plugin` (see `next.config.mjs`), which only runs under webpack, so Next's default Turbopack is disabled on purpose. Don't "modernize" these scripts to Turbopack.
- **`npm run lint` is broken.** Next 16 removed `next lint`, so it treats `lint` as a directory arg and errors. ESLint config still exists (`.eslintrc.json` → `next/core-web-vitals`); run `eslint` directly if you need linting.
- **No test framework** is configured — there are no tests to run.

## Architecture

### The canvas is React Flow, used *uncontrolled*

`src/app/page.tsx` → `DiagramFrame` → `<ReactFlowProvider>` → `Flow`. The whole app is this one canvas plus floating panels.

State is **not** held in React state or a global store — it lives inside React Flow's internal store, reached through `useReactFlow()` (`setNodes`/`setEdges`/`getNodes`/`getEdges`). Consequences to keep in mind:

- The canvas is seeded with `defaultNodes`/`defaultEdges` (uncontrolled), **not** controlled `nodes`/`edges` props.
- `onNodesChange` deliberately does **not** apply changes back (the `applyNodeChanges` version is commented out as "inefficient"). React Flow moves nodes itself; the handler only computes alignment helper lines. Don't "fix" this into a controlled pattern.
- To read or mutate the graph from anywhere, call `useReactFlow()` — don't add a parallel node/edge store.

### `useDiagram` is the orchestrator hook

`src/hooks/useDiagram.tsx` returns one object bundling every canvas handler (`onConnect`, `onDrop`, `onNodesDelete`, `onEdgeClick`, …), UI state (`editingEdgeId`, `selectedNodeId`), helpers (`uploadJson`, `deselectAll`), and even two sub-components (`HelperLines`, `Markers`). `Flow` spreads these onto `<ReactFlow>`. This hook is the first place to look when wiring canvas behavior. Note `EditableEdge` receives the `useDiagram` return value as a prop (dependency injection) rather than calling the hook itself.

### The one piece of global state: `store.ts`

`src/components/store.ts` is a tiny Zustand store holding **only** `connectionLinePath`. Its sole job is to carry the control points a user draws while dragging a connection into the edge created in `onConnect`/`onConnectEnd`. Everything else goes through React Flow.

### Nodes: a shape registry

- `src/components/shape/types/index.ts` exports `ShapeComponents`, an object mapping a shape key → an SVG component. **This is the extension point.** Its keys define the `ShapeType` union, drive the drag sidebar (`Sidebar` maps over `Object.keys(ShapeComponents)`), and resolve which SVG a node draws.
- **To add a shape:** create `src/components/shape/types/<name>.tsx` (an SVG component taking `ShapeProps`) and register it in `ShapeComponents`. It then appears in the sidebar, node picker, and renders automatically — no other wiring.
- `src/components/shape/index.tsx` (`Shape`) looks up the component and wraps it in an `<svg>`, offsetting by `strokeWidth` (SVG has no inset stroke).
- `src/components/shape-node/index.tsx` (`ShapeNode`, registered as node type `"shape"`) is the actual React Flow node: title input, the shape SVG, description textarea, an editable text label **or** a FontAwesome icon, a `NodeResizer`, a toolbar, and **12 connection handles** (all `type="source"`; `ConnectionMode.Loose` lets any handle be source or target). Node `data` shape: `{ type, color, title?, description?, contents?, icon? }`. Every data edit follows the same `setNodes(map → patch matching id's data)` pattern.

### Edges: editable multi-point paths

- `src/components/edges/EditableEdge/` — a custom edge (type `"editable-edge"`, the default) with draggable control points. Edge `data`: `{ algorithm, points: ControlPointData[] }`.
- Four path algorithms live in `path/` and are selected by the `Algorithm` enum in `constants.ts`: `linear`, `catmull-rom`, `bezier-catmull-rom` (default), `straight`.
- Clicking an edge sets `editingEdgeId`, which renders `EdgeToolbar` (top-center) for changing the algorithm, color, markers, etc.
- `MarkerDefinition` renders an SVG arrowhead `<marker>` per edge (see `useDiagram.Markers`).

### JSON round-trip (the source-control-friendly format)

- **Seed:** `src/json-diagrams/DiagramX.json` is imported in `DiagramFrame` and passed as `defaultNodes`/`defaultEdges` — this is the diagram shown on load.
- **Export:** `getSnapshotJson()` (in `useUndoRedo`) serializes `{ nodes, edges }` straight from the React Flow store.
- **Import:** `useDiagram.uploadJson()` parses, validates the `{ nodes, edges }` shape, and calls `setNodes`/`setEdges`.
- **Live view:** `JsonViewer` (Monaco editor, dynamically imported with `ssr: false`) shows the current JSON in the right panel.

### Export pipeline

`src/components/Downloads/` — all image exports use `html-to-image` on the `.react-flow__viewport` element and call `deselectAll()` first so selection chrome isn't captured:

- `DownloadImage.tsx` → `toPng` → `DiagramX.png`.
- `DownloadGif.tsx` → **exports SVG, not a GIF** (`toSvg` → `DiagramX.svg`). The name is misleading; the button reads "Download SVG (With animations)". Animations survive because edge CSS animations are inlined into the SVG.
- `DownloadJson.tsx` / `UploadJson.tsx` → JSON export/import.

### Undo/redo (hand-rolled) and theming

- `src/hooks/useUndoRedo.tsx` keeps `past`/`future` snapshot stacks (`{nodes, edges}`) in `useState`, cleared/pushed via `takeSnapshot()`. Snapshots are taken **manually** before each mutation (drop, connect, drag start, delete, resize, color/shape change). The installed `use-undoable` package is unused — this is the real implementation.
- `src/hooks/useTheme.tsx` + `useLocalStorage.tsx` implement dark mode by toggling the `dark` class on `<html>` (Tailwind `darkMode: "class"`). `next-themes` is installed but unused.

## Conventions & gotchas

- **Path aliases** (`tsconfig.json`): `@/*` → `src/*`, plus `@components/*`, `@hooks/*`, `@constants/*`. Use them.
- **"Save" doesn't persist.** The Save menu item only shows a toast; the diagram is **not** written to storage. Only the theme is persisted to `localStorage`. Real persistence = Export JSON. On reload the canvas resets to `DiagramX.json`.
- **`useUndoRedo` history is per-call-instance.** Because `past`/`future` are `useState`, each place that calls `useUndoRedo()` (`useDiagram`, `Flow`, `ShapeNode`, `EdgeToolbar`, `DownloadJson`) gets its *own* history stack. `takeSnapshot()` and `undo()`/`redo()` only line up when called on the same instance — the wired-up Undo/Redo buttons use the `useDiagram` instance. Serialization (`getSnapshotJson`) is safe from any instance since it reads the shared React Flow store. Be careful assuming a `takeSnapshot()` elsewhere feeds the visible undo button.
- **FontAwesome solid icons are bulk-registered** (`library.add(fas)` in `shape-node/index.tsx`); `IconPicker` virtualizes the full list with `react-window`.
- **App Router only.** Code lives under `src/app`; there is no `src/pages` despite the Tailwind content glob mentioning it.
- Several dependencies are installed but not imported anywhere (`d3`, `@davealdon/hext`, `react-modal`, `react-drag-drop-files`, `next-themes`, `use-undoable`). Don't assume a feature exists just because its library is in `package.json`.
