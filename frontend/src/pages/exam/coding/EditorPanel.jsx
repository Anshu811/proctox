import { useState } from "react";
import Editor from "@monaco-editor/react";

export default function EditorPanel({ language, onLanguageChange, code, onCodeChange, onReset }) {
  const [fontSize, setFontSize] = useState(14);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <div className="w-full bg-surface-container px-space-md py-space-xs flex items-center justify-between gap-space-sm shadow-sm z-10">
        <div className="relative inline-block">
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="appearance-none bg-surface-container-highest text-on-surface font-code-md text-code-md pl-space-sm pr-space-lg py-1 rounded-lg focus:outline-none cursor-pointer"
          >
            <option value="cpp">C++20 (GCC)</option>
            <option value="python">Python 3</option>
          </select>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant absolute right-2 top-2 pointer-events-none">
            expand_more
          </span>
        </div>

        <div className="flex items-center gap-space-xs">
          <div className="flex items-center bg-surface-container-lowest rounded-lg p-0.5">
            <button
              onClick={() => setFontSize((f) => Math.max(11, f - 1))}
              className="px-2 py-0.5 text-on-surface-variant hover:text-on-surface font-telemetry-label text-[11px] rounded"
            >
              A-
            </button>
            <span className="font-telemetry-label text-[10px] text-outline px-1">{fontSize}</span>
            <button
              onClick={() => setFontSize((f) => Math.min(20, f + 1))}
              className="px-2 py-0.5 text-on-surface-variant hover:text-on-surface font-telemetry-label text-[11px] rounded"
            >
              A+
            </button>
          </div>
          <button
            onClick={onReset}
            className="flex items-center gap-1 px-space-xs py-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors font-body-sm text-body-sm"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Monaco */}
      <div className="flex-1 min-h-0 bg-surface-container-lowest">
        <Editor
          height="100%"
          theme="vs-dark"
          language={language === "cpp" ? "cpp" : "python"}
          value={code}
          onChange={(v) => onCodeChange(v ?? "")}
          options={{
            fontSize,
            fontFamily: "JetBrains Mono, monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
          }}
        />
      </div>
    </div>
  );
}