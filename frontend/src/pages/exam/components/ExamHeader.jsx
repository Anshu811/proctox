export default function ExamHeader({
  title, type, current, total, secondsLeft, violations, maxViolations, onSubmitClick,
}) {
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const low = secondsLeft <= 60;

  return (
    <section className="sticky top-0 z-40 w-full bg-surface-container-lowest/95 backdrop-blur-md px-gutter-lg py-space-sm shadow-md">
      <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-space-md">
        {/* Left */}
        <div className="flex items-center gap-space-md min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-surface-container-high text-primary">
            <span className="material-symbols-outlined text-[22px]">dns</span>
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-space-xs">
              <span className="font-headline-md text-body-md text-on-surface font-semibold truncate">{title}</span>
              <span className="px-space-xs py-0.5 rounded text-[10px] font-telemetry-label uppercase bg-primary-container/30 text-primary-fixed">
                {type}
              </span>
            </div>
            <span className="font-telemetry-label text-telemetry-label text-on-surface-variant uppercase tracking-wider">
              Question <span className="text-on-surface font-bold text-[13px]">{current}</span> of {total}
            </span>
          </div>
        </div>

        {/* Center: timer */}
        <div className="flex items-center gap-space-sm px-space-md py-space-xs rounded-xl bg-surface-container-low shadow-sm">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${low ? "bg-error" : "bg-tertiary"}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${low ? "bg-error" : "bg-tertiary"}`}></span>
          </span>
          <span className="font-telemetry-label text-telemetry-label text-on-surface-variant uppercase">Time Remaining:</span>
          <span className={`font-timer-display text-timer-display tracking-wider ${low ? "text-error" : "text-on-surface"}`}>
            {mm}:{ss}
          </span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-space-md">
          <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-surface-container-low">
            <div className={`w-2 h-2 rounded-full ${violations === 0 ? "bg-tertiary" : "bg-error"}`}></div>
            <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">Violations:</span>
            <span className="font-telemetry-label text-telemetry-label text-on-surface font-bold">
              {violations} / {maxViolations}
            </span>
          </div>
          <button
            onClick={onSubmitClick}
            className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-container font-headline-md text-body-sm font-semibold shadow-md hover:brightness-110 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">task_alt</span>
            <span>Finish &amp; Submit Exam</span>
          </button>
        </div>
      </div>
    </section>
  );
}