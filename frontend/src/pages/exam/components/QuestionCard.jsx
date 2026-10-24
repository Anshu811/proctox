export default function QuestionCard({
  question, index, selected, onSelect, onPrev, onClear, onMarkNext, onSaveNext, isFirst, isLast,
}) {
  const letters = ["A", "B", "C", "D"];

  return (
    <div className="bg-surface-container-low rounded-xl p-space-lg sm:p-space-xl shadow-xl relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-36 h-36 bg-primary-container/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Meta */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md pb-space-sm">
        <div className="flex flex-wrap items-center gap-space-xs font-telemetry-label text-telemetry-label">
          <span className="px-space-sm py-1 rounded bg-surface-container-highest text-primary-fixed uppercase tracking-wider font-bold">
            Question {index + 1}
          </span>
          <span className="px-space-sm py-1 rounded bg-surface-container text-on-surface-variant">Single Correct</span>
          <span className="px-space-sm py-1 rounded bg-tertiary-container/30 text-on-tertiary-container font-semibold">
            +{question.marks.toFixed(2)} Marks
          </span>
          <span className="px-space-sm py-1 rounded bg-error-container/20 text-error">
            -{question.negative.toFixed(2)} Negative
          </span>
        </div>
        <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm">
          <span className="material-symbols-outlined text-[16px] text-secondary">category</span>
          <span className="truncate max-w-xs">{question.topic}</span>
        </div>
      </div>

      {/* Question */}
      <p className="font-body-lg text-body-lg text-on-surface leading-relaxed mb-space-xl">{question.text}</p>

      {/* Options */}
      <div className="flex flex-col gap-space-md mb-space-xl">
        {question.options.map((opt, i) => {
          const active = selected === i;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              className={`group flex items-center justify-between text-left p-space-md sm:p-space-lg rounded-xl shadow-sm transition-all ${
                active
                  ? "bg-primary-container/15 hover:bg-primary-container/20"
                  : "bg-surface-container hover:bg-surface-container-high"
              }`}
            >
              <div className="flex items-center gap-space-md min-w-0">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-code-lg text-code-lg font-bold transition-all ${
                    active
                      ? "bg-primary-container text-on-primary-container"
                      : "bg-surface-container-highest text-on-surface group-hover:bg-surface-bright"
                  }`}
                >
                  {letters[i]}
                </div>
                <span className="font-code-lg text-code-lg text-on-surface font-semibold tracking-wide">{opt}</span>
              </div>
              <div className="shrink-0 pl-space-md">
                {active ? (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center bg-primary text-on-primary">
                    <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full bg-surface-container-highest group-hover:bg-surface-bright"></div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-space-md pt-space-lg">
        <div className="flex items-center gap-space-sm">
          <button
            onClick={onPrev}
            disabled={isFirst}
            className="px-space-md py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-md text-body-md font-medium transition-colors flex items-center gap-space-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Previous</span>
          </button>
          <button
            onClick={onClear}
            className="px-space-md py-2.5 rounded-lg bg-surface-container-highest/60 hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface font-body-md text-body-md font-medium transition-colors flex items-center gap-space-xs"
          >
            <span className="material-symbols-outlined text-[18px]">ink_eraser</span>
            <span className="hidden sm:inline">Clear Response</span>
          </button>
        </div>

        <div className="flex items-center gap-space-sm">
          <button
            onClick={onMarkNext}
            className="px-space-md py-2.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-tertiary-fixed font-body-md text-body-md font-semibold transition-colors flex items-center gap-space-xs"
          >
            <span className="material-symbols-outlined text-[18px]">flag</span>
            <span>Mark for Review &amp; Next</span>
          </button>
          <button
            onClick={onSaveNext}
            className="px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary-container hover:brightness-110 active:scale-95 shadow-md font-body-md text-body-md font-semibold transition-all flex items-center gap-space-xs"
          >
            <span>{isLast ? "Save" : "Save & Next"}</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}