import { useState } from "react";

export default function QuestionPalette({ questions, answers, marked, visited, current, onJump }) {
  const [filter, setFilter] = useState("all");

  const getStatus = (q, i) => {
    if (i === current) return "current";
    if (marked.includes(i)) return "marked";
    if (answers[q.id] !== undefined) return "answered";
    return "unvisited";
  };

  const styles = {
    current: "bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(124,58,237,0.7)] scale-105 font-bold",
    marked: "bg-secondary-container text-on-secondary-container font-bold",
    answered: "bg-tertiary-container text-on-tertiary font-bold hover:brightness-110",
    unvisited: "bg-surface-container-highest text-on-surface-variant font-medium hover:bg-surface-bright hover:text-on-surface",
  };

  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length;
  const filters = [
    { key: "all", label: `All (${questions.length})` },
    { key: "answered", label: `Answered (${answeredCount})` },
    { key: "marked", label: `Marked (${marked.length})` },
    { key: "pending", label: `Pending (${questions.length - answeredCount})` },
  ];

  const show = (q, i) => {
    if (filter === "answered") return answers[q.id] !== undefined;
    if (filter === "marked") return marked.includes(i);
    if (filter === "pending") return answers[q.id] === undefined;
    return true;
  };

  return (
    <div className="bg-surface-container-low rounded-xl p-space-md shadow-lg flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <span className="font-headline-md text-body-md text-on-surface font-semibold flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">apps</span>
          Question Matrix
        </span>
        <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">Total: {questions.length}</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-2.5 py-1 rounded-md font-telemetry-label text-telemetry-label shrink-0 transition-colors ${
              filter === f.key
                ? "bg-primary-container text-on-primary-container"
                : "bg-surface-container text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 py-2 px-space-xs bg-surface-container rounded-lg text-[11px] font-telemetry-label text-on-surface-variant">
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-tertiary-container"></span>Answered</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-secondary-container"></span>Marked for Review</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-primary-container"></span>Current</div>
        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-surface-container-highest"></span>Not Visited</div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 gap-2 pt-1 font-telemetry-label text-telemetry-label">
        {questions.map((q, i) =>
          show(q, i) ? (
            <button
              key={q.id}
              onClick={() => onJump(i)}
              className={`h-9 rounded-lg flex items-center justify-center transition-all relative ${styles[getStatus(q, i)]}`}
            >
              {String(i + 1).padStart(2, "0")}
              {marked.includes(i) && i !== current && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-secondary-fixed"></span>
              )}
            </button>
          ) : null
        )}
      </div>
    </div>
  );
}