# DiagramX

DiagramX is a website that lets you get to the point and make diagrams.

![DiagramX](/public/main.png)

The diagrams are source-control friendly with a json format.

![DiagramX](/public/sidebar.png)

You can also export the diagrams to SVG with some animations included, or static photos.

![DiagramX](/public/menu.png)

## Import Mermaid

Open the top-right **Menu → Import Mermaid** to paste Mermaid code (or upload a `.mmd` file)
and turn it into editable shapes. Flowchart, class, state, ER and mindmap diagrams are
supported; other types (sequence, gantt, pie…) aren't converted. No account or key needed.

## Export to PDF

Alongside PNG, SVG and JSON, the Menu has a **Download PDF** option.

## AI assistant

The robot button (top-right) opens a chat that builds and edits the diagram for you — describe
a diagram or upload a sketch, and it draws editable shapes on the canvas. It runs on a free
NVIDIA endpoint, so you need a key:

1. Get a free key at https://build.nvidia.com/settings/api-keys (starts with `nvapi-`).
2. Copy `.env.example` to `.env.local` and set `NVIDIA_API_KEY`.
3. Restart the dev server.

The key stays server-side (in the `/api/chat` route) and is never sent to the browser.
