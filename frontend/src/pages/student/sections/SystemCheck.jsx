import { useCallback, useEffect, useState } from "react";
import { api } from "../../../services/api";

export default function SystemCheck() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null); // { server, ms, network, tabs }

  const run = useCallback(async () => {
    setChecking(true);
    const started = performance.now();
    let server = false;
    try {
      const health = await api("/health");
      server = health?.status === "ok" && health?.db === "connected";
    } catch {
      server = false;
    }
    setResult({
      server,
      ms: Math.round(performance.now() - started),
      network: navigator.onLine,
      // Exams detect tab switches through the Page Visibility API
      tabs: typeof document.visibilityState === "string",
    });
    setChecking(false);
  }, []);

  // Run once when the dashboard opens
  useEffect(() => {
    run();
  }, [run]);

  const items = result
    ? [
        { ok: result.server, label: result.server ? `Server connected (${result.ms} ms)` : "Server not reachable" },
        { ok: result.network, label: result.network ? "Network online" : "Network offline" },
        { ok: result.tabs, label: result.tabs ? "Tab monitoring supported" : "Tab monitoring not supported" },
      ]
    : [];

  const allGood = items.length > 0 && items.every((i) => i.ok);
  const secure = window.location.protocol === "https:";

  return (
    <div className="rounded-xl bg-surface-container-low p-space-md flex flex-col md:flex-row items-center justify-between gap-space-md shadow-sm">
      <div className="flex items-center gap-space-md min-w-0">
        <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-tertiary shrink-0">
          <span className={`material-symbols-outlined text-[20px] ${checking ? "animate-spin" : ""}`}>
            {checking ? "progress_activity" : "terminal"}
          </span>
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-telemetry-label text-telemetry-label text-on-surface uppercase">System Check</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant flex flex-wrap items-center gap-x-space-sm gap-y-1" aria-live="polite">
            {checking && !result && "Checking your connection..."}
            {items.map((i) => (
              <span key={i.label} className="inline-flex items-center gap-1">
                <span className={`material-symbols-outlined text-[16px] ${i.ok ? "text-tertiary" : "text-error"}`}>
                  {i.ok ? "check_circle" : "cancel"}
                </span>
                {i.label}
              </span>
            ))}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-space-sm shrink-0">
        {result && (
          <span
            className={`font-code-md text-code-md px-space-sm py-1 rounded bg-surface-container ${
              allGood ? "text-tertiary" : "text-error"
            }`}
          >
            {allGood ? "Ready for exams" : "Needs attention"}
          </span>
        )}
        <span className="font-code-md text-code-md text-on-surface-variant bg-surface-container px-space-sm py-1 rounded">
          {secure ? "HTTPS" : "Local (HTTP)"}
        </span>
        <button
          onClick={run}
          disabled={checking}
          className="px-space-md py-1.5 rounded-lg bg-surface-container text-on-surface font-body-sm text-body-sm hover:bg-surface-container-high transition-colors disabled:opacity-60"
        >
          {checking ? "Checking..." : "Run Check Again"}
        </button>
      </div>
    </div>
  );
}