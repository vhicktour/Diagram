"use client";

import { useEffect, useRef, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import MonacoEditor from "react-monaco-editor";
import { IoMdClose } from "react-icons/io";
import { FaFileDownload } from "react-icons/fa";
import type { useDiagram } from "@/hooks/useDiagram";

type MermaidEditorProps = {
  onClose: () => void;
  diagram: ReturnType<typeof useDiagram>;
  code: string;
  setCode: (code: string) => void;
  theme?: string | null;
};

// Live code editor: the canvas mirrors this Mermaid as you type (flowchart,
// class, state, ER, mindmap). Editing replaces the canvas; the first change
// takes one undo snapshot so the previous diagram can be restored.
export const MermaidEditor = ({ onClose, diagram, code, setCode, theme }: MermaidEditorProps) => {
  const { setNodes, setEdges, takeSnapshot } = diagram;
  const { fitView } = useReactFlow();
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const snapshotTaken = useRef(false);

  useEffect(() => {
    const text = code.trim();
    if (!text) {
      setStatus(null);
      return;
    }
    const handle = setTimeout(async () => {
      const { convertMermaidToDiagram } = await import("@/lib/mermaid");
      const result = await convertMermaidToDiagram(text);
      if (!result.ok) {
        setStatus({ ok: false, message: result.message });
        return;
      }
      if (!snapshotTaken.current) {
        takeSnapshot();
        snapshotTaken.current = true;
      }
      setNodes(result.nodes);
      setEdges(result.edges);
      setStatus({ ok: true, message: `${result.nodes.length} nodes, ${result.edges.length} edges` });
      setTimeout(() => fitView({ duration: 200, padding: 0.2 }), 50);
    }, 600);
    return () => clearTimeout(handle);
  }, [code, setNodes, setEdges, takeSnapshot, fitView]);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setCode((e.target?.result as string) ?? "");
      reader.readAsText(file);
    }
    event.target.value = "";
  };

  return (
    <div className="bg-white dark:bg-black text-black dark:text-white p-4 flex flex-col gap-3 w-full h-full">
      <div className="flex flex-row justify-between items-center">
        <div className="italic font-semibold text-xl">Mermaid</div>
        <div
          onClick={onClose}
          className="flex cursor-pointer flex-row justify-center items-center border-[1px] border-black dark:border-white hover:bg-gray-100 hover:dark:bg-slate-800 p-2 rounded-md"
        >
          <IoMdClose />
        </div>
      </div>
      <div className="text-xs opacity-70">
        The canvas mirrors this code as you type — then drag the shapes to fine-tune.
      </div>
      <div className="flex-1 min-h-40 rounded-md overflow-hidden border border-gray-300 dark:border-slate-700">
        {/* react-monaco-editor's defaultProps noops are not applied at runtime
            under Next 16, so its lifecycle props must be passed explicitly —
            otherwise it crashes with "editorWillMount is not a function". */}
        <MonacoEditor
          width="100%"
          height="100%"
          language="markdown"
          theme={theme === "dark" ? "vs-dark" : "vs"}
          value={code}
          onChange={(value) => setCode(value ?? "")}
          editorWillMount={() => {}}
          editorDidMount={() => {}}
          editorWillUnmount={() => {}}
          options={{
            automaticLayout: true,
            minimap: { enabled: false },
            lineNumbers: "on",
            fontSize: 13,
            wordWrap: "on",
            scrollBeyondLastLine: false,
            tabSize: 2,
            padding: { top: 8 },
          }}
        />
      </div>
      <div className="flex flex-row gap-2 justify-between items-center min-h-6">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="text-sm dark:text-white dark:hover:bg-slate-800 hover:bg-gray-200 rounded-md py-1 px-2 flex flex-row gap-2 items-center border border-black dark:border-white"
        >
          Upload file
          <FaFileDownload />
        </button>
        {status ? (
          <span className={`text-xs ${status.ok ? "text-green-500" : "text-red-500"}`}>
            {status.ok ? `✓ ${status.message}` : status.message}
          </span>
        ) : null}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mmd,.mermaid,.txt"
        style={{ display: "none" }}
        onInput={onFileChange}
      />
    </div>
  );
};

export default MermaidEditor;
