export default function CodingHeader({
  examTitle, problems, activeIndex, onSelect,
  secondsLeft, violations, maxViolations, running, onRun, onSubmit,
}) {
  const h = String(Math.floor(secondsLeft / 3600)).padStart(2, "0");
  const m = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, "0");
  const s = String(secondsLeft % 60).padStart(2, "0");
  const low = secondsLeft <= 300;

  return (
    <div className="w-full bg-surface-container-lowest px-gutter-lg py-space-sm flex flex-wrap items-center justify-between gap-space-md shadow-md relative z-20">
      {/* Left: title + problem pills */}
      <div className="flex flex-wrap items-center gap-space-md">
        <div className="flex flex-col">
          <span className="font-telemetry-label text-telemetry-label text-primary uppercase tracking-wider">Coding Lab</span>
          <h1 className="font-headline-md text-headline-md text-on-surface font-semibold tracking-tight">{examTitle}</h1>
        </div>
        <div className="flex items-center bg-surface-container-low p-space-xs rounded-xl">
          {problems.map((p, i) => (
            <button
              key={p.id}
              onClick={() => onSelect(i)}
              className={`px-space-sm py-space-xs rounded-lg font-body-sm text-body-sm transition-all ${
                i === activeIndex
                  ? "bg-surface-container-highest text-on-surface font-medium shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              {p.short}
            </button>
          ))}
        </div>
      </div>

      {/* Center: timer */}
      <div className="flex items-center gap-space-sm bg-surface-container px-space-md py-space-xs rounded-xl shadow-inner">
        <span className={`material-symbols-outlined text-[20px] ${low ? "text-error" : "text-primary"}`}>timer</span>
        <div className="flex flex-col items-center">
          <span className="font-telemetry-label text-[10px] text-on-surface-variant uppercase tracking-widest leading-none">Time Remaining</span>
          <span className={`font-timer-display text-timer-display tracking-wider ${low ? "text-error" : "text-on-surface"}`}>
            {h}:{m}:{s}
          </span>
        </div>
      </div>

      {/* Right: violations + buttons */}
      <div className="flex items-center gap-space-sm">
        <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface-container-low">
          <span className={`material-symbols-outlined text-[18px] ${violations === 0 ? "text-tertiary" : "text-error"}`}>verified_user</span>
          <div className="flex flex-col text-left">
            <span className={`font-telemetry-label text-[10px] font-bold leading-tight ${violations === 0 ? "text-tertiary" : "text-error"}`}>
              {violations} / {maxViolations} VIOLATIONS
            </span>
            <span className="font-telemetry-label text-[9px] text-on-surface-variant uppercase">Tab switch tracked</span>
          </div>
        </div>

        <button
          onClick={onRun}
          disabled={running}
          className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-tertiary font-body-md text-body-md font-semibold transition-all shadow-sm disabled:opacity-60"
        >
          <span className={`material-symbols-outlined text-[18px] ${running ? "animate-spin" : ""}`}>
            {running ? "refresh" : "play_arrow"}
          </span>
          <span>{running ? "Running..." : "Run Code"}</span>
        </button>

        <button
          onClick={onSubmit}
          disabled={running}
          className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-primary-container hover:brightness-110 text-on-primary-container font-body-md text-body-md font-semibold transition-all shadow-md disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
          <span>Submit</span>
        </button>
      </div>
    </div>
  );
}