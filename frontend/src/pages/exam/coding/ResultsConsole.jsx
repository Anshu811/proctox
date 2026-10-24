import { useState } from "react";

const statusStyle = {
  PASSED: { icon: "check_circle", cls: "text-tertiary" },
  FAILED: { icon: "cancel", cls: "text-error" },
  NOT_RUN: { icon: "pending", cls: "text-outline" },
};

export default function ResultsConsole({ result, running }) {
  const [tab, setTab] = useState("cases");

  const tabs = [
    { key: "cases", label: "Test Cases", icon: "done_all" },
    { key: "output", label: "Output", icon: "code_blocks" },
  ];

  return (
    <div className="w-full bg-surface-container flex flex-col shadow-lg z-10">
      <div className="flex items-center gap-space-xs px-space-md bg-surface-container-high">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-space-sm py-2 font-telemetry-label text-telemetry-label rounded-t-lg flex items-center gap-1.5 transition-all ${
              tab === t.key ? "text-tertiary bg-surface-container" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div className="p-space-md h-48 overflow-y-auto bg-surface-container">
        {running && <p className="font-body-md text-body-md text-on-surface-variant">Running your code...</p>}

        {!running && !result && (
          <p className="font-body-md text-body-md text-on-surface-variant">
            Click <strong className="text-on-surface">Run Code</strong> to test on the sample cases.
          </p>
        )}

        {!running && result && tab === "output" && (
          <pre className="font-code-md text-code-md text-on-surface-variant whitespace-pre-wrap">{result.output}</pre>
        )}

        {!running && result && tab === "cases" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
            {result.cases.map((c) => {
              const st = statusStyle[c.status] || statusStyle.NOT_RUN;
              return (
                <div key={c.name} className="bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-space-xs">
                    <span className={`material-symbols-outlined text-[18px] ${st.cls}`}>
                      {c.hidden ? "lock" : st.icon}
                    </span>
                    <div className="flex flex-col">
                      <span className="font-body-sm text-body-sm font-semibold text-on-surface">{c.name}</span>
                      <span className="font-telemetry-label text-[10px] text-on-surface-variant">{c.detail}</span>
                    </div>
                  </div>
                  <span className={`font-telemetry-label text-telemetry-label ${st.cls}`}>{c.status.replace("_", " ")}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}