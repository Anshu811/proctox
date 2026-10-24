export default function ProgressCard({ total, answered, marked, unvisited }) {
  const percent = Math.round((answered / total) * 100);

  const stats = [
    { label: "Answered", value: answered, cls: "text-tertiary" },
    { label: "Review", value: marked, cls: "text-secondary" },
    { label: "Unvisited", value: unvisited, cls: "text-on-surface-variant" },
  ];

  return (
    <div className="bg-surface-container-low rounded-xl p-space-md shadow-lg flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-primary text-[20px]">analytics</span>
          <span className="font-headline-md text-body-md text-on-surface font-semibold">Assessment Progress</span>
        </div>
        <span className="font-telemetry-label text-telemetry-label font-bold text-tertiary">{percent}% DONE</span>
      </div>

      <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
        <div className="bg-tertiary h-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center pt-1 font-telemetry-label text-telemetry-label">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface-container rounded-lg p-2">
            <span className={`block text-body-md font-bold ${s.cls}`}>{s.value}</span>
            <span className="text-[10px] text-on-surface-variant uppercase">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}