"use client";

import { useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import { IoMdClose } from "react-icons/io";
import { FaImage, FaPaperPlane } from "react-icons/fa";
import type { useDiagram } from "@/hooks/useDiagram";
import { useDiagramTools } from "@/hooks/useDiagramTools";
import { useToast } from "../Toast/useToast";

type ChatProps = {
  onClose: () => void;
  diagram: ReturnType<typeof useDiagram>;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Fallback for models that answer with a ```mermaid block instead of calling the
// apply_mermaid tool: surface the block with a button that imports it.
function splitMermaid(text: string): { type: "text" | "mermaid"; content: string }[] {
  const parts: { type: "text" | "mermaid"; content: string }[] = [];
  const regex = /```mermaid\s*\n([\s\S]*?)```/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push({ type: "text", content: text.slice(last, match.index) });
    parts.push({ type: "mermaid", content: match[1].trim() });
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push({ type: "text", content: text.slice(last) });
  return parts;
}

const MessageText = ({ text, diagram }: { text: string; diagram: ChatProps["diagram"] }) => {
  const { toast } = useToast();
  const apply = async (code: string) => {
    const result = await diagram.importMermaid(code);
    toast(
      result.ok
        ? { title: "Diagram imported", description: `Added ${result.nodes.length} nodes.` }
        : { title: "Couldn't import", description: result.message }
    );
  };

  return (
    <>
      {splitMermaid(text).map((part, index) =>
        part.type === "mermaid" ? (
          <div key={index} className="my-1 rounded-md border border-gray-300 dark:border-slate-700 overflow-hidden">
            <pre className="font-mono text-xs p-2 overflow-x-auto bg-gray-50 dark:bg-slate-900">{part.content}</pre>
            <button
              onClick={() => apply(part.content)}
              className="w-full text-xs p-1 bg-slate-800 text-white hover:bg-slate-700"
            >
              Apply to canvas
            </button>
          </div>
        ) : (
          <span key={index} className="whitespace-pre-wrap">
            {part.content}
          </span>
        )
      )}
    </>
  );
};

const Message = ({ message, diagram }: { message: UIMessage; diagram: ChatProps["diagram"] }) => {
  const isUser = message.role === "user";
  return (
    <div
      className={`max-w-[90%] rounded-md p-2 text-sm ${
        isUser
          ? "self-end bg-blue-500 text-white"
          : "self-start bg-gray-100 dark:bg-slate-800"
      }`}
    >
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          return <MessageText key={index} text={part.text} diagram={diagram} />;
        }
        if (part.type === "file" && part.mediaType?.startsWith("image/")) {
          // eslint-disable-next-line @next/next/no-img-element
          return <img key={index} src={part.url} alt="attachment" className="max-h-32 rounded my-1" />;
        }
        if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
          const toolName =
            part.type === "dynamic-tool"
              ? (part as { toolName?: string }).toolName
              : part.type.replace("tool-", "");
          return (
            <div key={index} className="text-xs opacity-60 font-mono py-0.5">
              ⚙ {toolName}
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};

export const Chat = ({ onClose, diagram }: ChatProps) => {
  const { runTool } = useDiagramTools(diagram);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status, error, addToolOutput } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: ({ toolCall }) => {
      if (toolCall.dynamic) return;
      // Don't await inside onToolCall (deadlocks); report the result separately.
      runTool(toolCall.toolName, toolCall.input as Record<string, unknown>)
        .then((output) =>
          addToolOutput({ tool: toolCall.toolName, toolCallId: toolCall.toolCallId, output })
        )
        .catch((err) =>
          addToolOutput({
            tool: toolCall.toolName,
            toolCallId: toolCall.toolCallId,
            state: "output-error",
            errorText: err instanceof Error ? err.message : String(err),
          })
        );
    },
  });

  const busy = status === "streaming" || status === "submitted";

  const submit = async () => {
    if (busy) return;
    const text = input.trim();
    if (!text && files.length === 0) return;
    const fileParts = await Promise.all(
      files.map(async (file) => ({
        type: "file" as const,
        mediaType: file.type,
        url: await fileToDataUrl(file),
      }))
    );
    sendMessage({
      role: "user",
      parts: [...(text ? [{ type: "text" as const, text }] : []), ...fileParts],
    });
    setInput("");
    setFiles([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="bg-white dark:bg-black text-black dark:text-white p-4 flex flex-col gap-3 w-full h-full">
      <div className="flex flex-row justify-between items-center">
        <div className="italic font-semibold text-xl">AI Assistant</div>
        <div
          onClick={onClose}
          className="flex cursor-pointer flex-row justify-center items-center border-[1px] border-black dark:border-white hover:bg-gray-100 hover:dark:bg-slate-800 p-2 rounded-md"
        >
          <IoMdClose />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2">
        {messages.length === 0 ? (
          <div className="opacity-60 text-xs">
            Ask me to draw or edit a diagram — e.g. &quot;Create a signup flow&quot;, or attach a
            sketch and say &quot;recreate this&quot;.
          </div>
        ) : null}
        {messages.map((message) => (
          <Message key={message.id} message={message} diagram={diagram} />
        ))}
        {error ? (
          <div className="text-red-500 text-xs">
            Something went wrong. Check that NVIDIA_API_KEY is set in .env.local, then try again.
          </div>
        ) : null}
      </div>

      {files.length ? (
        <div className="text-xs opacity-70">
          {files.length} image{files.length > 1 ? "s" : ""} attached
        </div>
      ) : null}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="flex flex-row gap-2 items-end"
      >
        <button
          type="button"
          title="Attach image"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-md border border-black dark:border-white hover:bg-gray-100 hover:dark:bg-slate-800"
        >
          <FaImage />
        </button>
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Describe a diagram…"
          rows={2}
          className="flex-1 resize-none rounded-md border border-gray-300 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="p-2 rounded-md bg-slate-800 text-white disabled:opacity-50"
        >
          <FaPaperPlane />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: "none" }}
          onChange={(event) => setFiles(event.target.files ? Array.from(event.target.files) : [])}
        />
      </form>
    </div>
  );
};

export default Chat;
