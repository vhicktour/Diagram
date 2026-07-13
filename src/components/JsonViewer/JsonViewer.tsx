import React, { useEffect, useRef, useState } from "react";
import MonacoEditor from "react-monaco-editor";
import "./jsonViewer.css";
import { IoMdClose } from "react-icons/io";

interface JsonViewerProps {
  jsonString: string;
  toggleRightSidebar: () => void;
}

const JsonViewer: React.FC<JsonViewerProps> = (props: JsonViewerProps) => {
  let prettyJsonString: string;
  const observedDiv = useRef<any>(null);
  const [width, setWidth] = useState();
  const [height, setHeight] = useState();
  const [syntaxHighlighting, setSyntaxHighlighting] = useState<boolean>(false);

  try {
    const jsonObj = JSON.parse(props.jsonString);
    prettyJsonString = JSON.stringify(jsonObj, null, 2);
  } catch (error) {
    prettyJsonString = "Invalid JSON string";
  }

  useEffect(() => {
    const element = observedDiv.current;
    if (!element) return;

    // React skips the re-render when the size is unchanged, so we can set
    // width/height unconditionally on every resize.
    const resizeObserver = new ResizeObserver(() => {
      setWidth(element.offsetWidth);
      setHeight(element.offsetHeight);
    });
    resizeObserver.observe(element);

    return () => resizeObserver.disconnect();
  }, []);

  const copyAll = async () => {
    await navigator.clipboard.writeText(prettyJsonString);
    alert("Copied to clipboard");
  };

  return (
    <div
      ref={observedDiv}
      className="w-full json-viewer overflow-y-auto bg-[#1e1e1e]"
    >
      <div className="flex flex-row h-16 justify-between items-center p-4">
        <button
          className="text-white p-2 m-2 bg-slate-800 rounded-md"
          onClick={copyAll}
        >
          Copy
        </button>
        <button
          className="text-white p-2 m-2 bg-slate-800 rounded-md"
          onClick={() => setSyntaxHighlighting(!syntaxHighlighting)}
        >
          Syntax
        </button>
        <div
          onClick={props.toggleRightSidebar}
          className="flex text-white hover:text-black cursor-pointer h-8 flex-row gap-3 justify-center items-center border-[1px] border-white hover:bg-gray-100 p-2 rounded-md"
        >
          <IoMdClose />
        </div>
      </div>
      {/* react-monaco-editor's defaultProps noops are not applied at runtime
          under Next 16, so its lifecycle props must be passed explicitly —
          otherwise it crashes with "editorWillMount is not a function". */}
      <MonacoEditor
        width={width}
        height={height}
        language={syntaxHighlighting ? "json" : ""}
        theme="vs-dark"
        value={prettyJsonString}
        editorWillMount={() => {}}
        editorDidMount={() => {}}
        editorWillUnmount={() => {}}
        options={{
          readOnly: true,
          lineNumbers: "on",
          glyphMargin: false,
          folding: false,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 0,
          minimap: {
            enabled: true,
          },
          stopRenderingLineAfter: 1000,
          mouseWheelZoom: true,
        }}
      />
    </div>
  );
};

export default JsonViewer;
