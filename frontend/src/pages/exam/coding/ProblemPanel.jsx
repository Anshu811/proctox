export default function ProblemPanel({ problem }) {
  const diffCls =
    problem.difficulty === "Easy"
      ? "bg-tertiary-container/30 text-tertiary"
      : "bg-secondary-container/30 text-secondary";

  return (
    <div className="p-space-lg flex flex-col gap-space-md">
      <div className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-between">
          <span className="font-telemetry-label text-telemetry-label text-tertiary uppercase">Task: {problem.id.toUpperCase()}</span>
          <span className="font-telemetry-label text-telemetry-label text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
            Score: {problem.points} PTS
          </span>
        </div>
        <h2 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">{problem.title}</h2>
        <div className="flex items-center gap-space-xs flex-wrap mt-space-xs">
          <span className={`font-telemetry-label text-[11px] px-2 py-0.5 rounded-md ${diffCls}`}>{problem.difficulty}</span>
          {problem.tags.map((t) => (
            <span key={t} className="font-telemetry-label text-[11px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-md">
              {t}
            </span>
          ))}
          <span className="font-telemetry-label text-[11px] bg-primary-container/20 text-primary px-2 py-0.5 rounded-md">
            C++ / Python
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-space-sm font-body-md text-body-md text-on-surface-variant leading-relaxed">
        {problem.description.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-xs shadow-sm">
        <div className="flex items-center gap-space-xs text-on-surface font-semibold">
          <span className="material-symbols-outlined text-secondary text-[18px]">rule</span>
          <span className="font-body-md text-body-md">Constraints</span>
        </div>
        <ul className="font-telemetry-label text-telemetry-label text-on-surface-variant flex flex-col gap-1.5">
          {problem.constraints.map((c) => (
            <li key={c} className="flex items-center gap-space-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      {problem.samples.map((s) => (
        <div key={s.title} className="flex flex-col gap-space-xs">
          <span className="font-body-md text-body-md font-semibold text-on-surface flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[18px]">terminal</span>
            {s.title}
          </span>
          <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm font-code-md text-code-md shadow-inner">
            <div>
              <span className="font-telemetry-label text-telemetry-label text-on-surface-variant uppercase">Input:</span>
              <pre className="bg-surface-container-lowest p-space-xs rounded-lg text-on-surface mt-1 overflow-x-auto">{s.input}</pre>
            </div>
            <div>
              <span className="font-telemetry-label text-telemetry-label text-on-surface-variant uppercase">Expected Output:</span>
              <pre className="bg-surface-container-lowest p-space-xs rounded-lg text-tertiary mt-1 font-semibold">{s.output}</pre>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant italic">{s.note}</p>
          </div>
        </div>
      ))}
    </div>
  );
}