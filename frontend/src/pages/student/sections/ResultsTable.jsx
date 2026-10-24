import { useState } from "react";

const PREVIEW_COUNT = 5;

const headers = ["Exam Title", "Format", "Submitted", "Time Spent", "Proctor Log", "Score", "Status"];

const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "-";

// "48m 12s / 60m" (time spent is capped at the exam duration)
function timeSpent(e) {
  if (!e.started_at || !e.submitted_at) return "-";
  const limit = e.duration_minutes * 60;
  const secs = Math.min(
    limit,
    Math.max(0, Math.round((new Date(e.submitted_at) - new Date(e.started_at)) / 1000))
  );
  return `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, "0")}s / ${e.duration_minutes}m`;
}

const percentClass = (p) =>
  p >= 75
    ? "bg-tertiary text-on-tertiary"
    : p >= 40
    ? "bg-secondary-container text-on-secondary-container"
    : "bg-error-container text-on-error-container";

export default function ResultsTable({ results = [] }) {
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? results : results.slice(0, PREVIEW_COUNT);

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary text-[22px]">history_edu</span>
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Recent Results &amp; Proctor Logs</h2>
        </div>
        {results.length > PREVIEW_COUNT && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="font-body-sm text-body-sm text-primary hover:underline font-semibold flex items-center gap-1"
          >
            <span>{showAll ? "Show less" : `View All ${results.length}`}</span>
            <span className="material-symbols-outlined text-[16px]">{showAll ? "expand_less" : "chevron_right"}</span>
          </button>
        )}
      </div>

      <div className="rounded-xl bg-surface-container overflow-hidden shadow-xl">
        {results.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-space-xs py-space-xl text-on-surface-variant">
            <span className="material-symbols-outlined text-[32px] text-outline">history_edu</span>
            <span>No results yet. Finish an exam and it will show up here.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-high text-on-surface-variant font-telemetry-label text-telemetry-label uppercase tracking-wider">
                  {headers.map((h, i) => (
                    <th key={h} className={`py-space-md px-space-md ${i === headers.length - 1 ? "text-right" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest font-body-md text-body-md">
                {shown.map((e) => {
                  const clean = e.violation_count === 0;
                  const sub = [e.course_code, e.description].filter(Boolean).join(" • ");
                  return (
                    <tr key={e.id} className="hover:bg-surface-container-high/60 transition-colors">
                      <td className="py-space-md px-space-md">
                        <div className="flex flex-col">
                          <span className="font-headline-md text-body-lg text-on-surface font-semibold">{e.title}</span>
                          {sub && (
                            <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">{sub}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-space-md px-space-md">
                        <span
                          className={`font-telemetry-label text-telemetry-label px-2 py-0.5 rounded font-bold uppercase ${
                            e.type === "coding"
                              ? "bg-tertiary-container text-on-tertiary-container"
                              : "bg-primary-container text-on-primary-container"
                          }`}
                        >
                          {e.type}
                        </span>
                      </td>
                      <td className="py-space-md px-space-md font-code-md text-code-md text-on-surface-variant whitespace-nowrap">
                        {fmtDate(e.submitted_at)}
                      </td>
                      <td className="py-space-md px-space-md font-code-md text-code-md text-on-surface whitespace-nowrap">
                        {timeSpent(e)}
                      </td>
                      <td className="py-space-md px-space-md">
                        <span
                          className={`inline-flex items-center gap-1 font-telemetry-label text-telemetry-label px-2 py-0.5 rounded font-bold whitespace-nowrap ${
                            clean
                              ? "bg-tertiary-container/30 text-tertiary-fixed-dim"
                              : "bg-surface-container-highest text-secondary"
                          }`}
                        >
                          <span className="material-symbols-outlined text-[14px]">{clean ? "verified_user" : "warning"}</span>
                          {clean
                            ? "0 Warnings • Clean"
                            : `${e.violation_count} ${e.violation_count === 1 ? "Warning" : "Warnings"}`}
                        </span>
                      </td>
                      <td className="py-space-md px-space-md">
                        <div className="flex items-center gap-space-sm whitespace-nowrap">
                          <span className="font-code-lg text-code-lg font-bold text-on-surface">
                            {e.score} / {e.max_score}
                          </span>
                          {e.percent !== null && (
                            <span className={`font-telemetry-label text-telemetry-label px-2 py-0.5 rounded font-bold ${percentClass(e.percent)}`}>
                              {Math.round(e.percent)}%
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-space-md px-space-md text-right">
                        <span
                          className={`font-telemetry-label text-telemetry-label px-2 py-0.5 rounded font-bold uppercase whitespace-nowrap ${
                            e.attempt_status === "auto_submitted"
                              ? "bg-error-container/40 text-error"
                              : "bg-surface-container-low text-on-surface-variant"
                          }`}
                        >
                          {e.attempt_status === "auto_submitted" ? "Auto-submitted" : "Submitted"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}