import { Link } from "react-router-dom";

const fmtWhen = (iso) =>
  new Date(iso).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

// "in 3 hrs", "in 20 min", "in 2 days"
function untilText(iso) {
  const mins = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (mins <= 0) return "now";
  if (mins < 60) return `in ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs} ${hrs === 1 ? "hr" : "hrs"}`;
  const days = Math.floor(hrs / 24);
  return `in ${days} ${days === 1 ? "day" : "days"}`;
}

function windowText(e) {
  if (e.start_time && e.end_time) return `Window: ${fmtWhen(e.start_time)} - ${fmtWhen(e.end_time)}`;
  if (e.end_time) return `Closes ${fmtWhen(e.end_time)}`;
  if (e.start_time) return `Opens ${fmtWhen(e.start_time)}`;
  return "Open anytime";
}

// Course tag and a clean title ("CS402: Data Structures Lab" -> "Data Structures Lab")
function labels(e) {
  const code = e.course_code || "";
  const tag = [code, e.description].filter(Boolean).join(" • ").toUpperCase();
  const prefix = `${code}:`;
  const title = code && e.title.startsWith(prefix) ? e.title.slice(prefix.length).trim() : e.title;
  return { tag: tag || "CODING EXAM", title };
}

export default function CodingAssessments({ exams = [] }) {
  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <div className="w-3 h-3 rounded bg-tertiary"></div>
          <h2 className="font-headline-md text-headline-md text-on-surface font-bold">Coding Assessments (Python &amp; C++)</h2>
          <span className="font-telemetry-label text-telemetry-label bg-tertiary-container/40 text-tertiary px-2 py-0.5 rounded-full">
            {exams.length} {exams.length === 1 ? "EXAM" : "EXAMS"}
          </span>
        </div>
        <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">CODE RUNS IN A SANDBOX</span>
      </div>

      {exams.length === 0 ? (
        <div className="rounded-xl bg-surface-container-low p-space-lg text-on-surface-variant text-center">
          No coding exams have been published yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          {exams.map((e) => {
            const { tag, title } = labels(e);
            const active = e.state === "available" || e.state === "in_progress";

            let footer;
            if (e.state === "available") {
              footer = (
                <span className="font-telemetry-label text-telemetry-label text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-primary">security</span>
                  Auto-submits after {e.max_violations} tab-switch warnings
                </span>
              );
            } else if (e.state === "in_progress") {
              footer = (
                <span className="font-telemetry-label text-telemetry-label text-on-surface-variant flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px] text-secondary">timer</span>
                  About {Math.ceil(e.seconds_left / 60)} min were left when this page loaded
                </span>
              );
            } else if (e.state === "upcoming") {
              footer = (
                <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">
                  Opens {untilText(e.start_time)}
                </span>
              );
            } else if (e.state === "finished") {
              footer = (
                <span className="font-telemetry-label text-telemetry-label text-tertiary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">task_alt</span>
                  Score {e.score} / {e.max_score}
                </span>
              );
            } else {
              footer = (
                <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">
                  The exam window has ended
                </span>
              );
            }

            return (
              <div
                key={e.id}
                className={
                  active
                    ? "rounded-xl bg-surface-container p-space-lg shadow-xl flex flex-col justify-between relative overflow-hidden"
                    : "rounded-xl bg-surface-container-low p-space-lg shadow-md flex flex-col justify-between opacity-80 hover:opacity-100 transition-opacity"
                }
              >
                {active && (
                  <div className="absolute top-0 right-0 w-32 h-32 bg-tertiary/10 rounded-full blur-2xl pointer-events-none"></div>
                )}

                <div className="flex flex-col gap-space-md">
                  <div className="flex items-start justify-between gap-space-sm">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-space-xs flex-wrap">
                        <span className={`font-telemetry-label text-telemetry-label font-bold ${active ? "text-tertiary" : "text-outline"}`}>
                          {tag}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-surface-container-highest font-code-md text-[10px] text-on-surface-variant">
                          C++ / Python
                        </span>
                      </div>
                      <h3 className="font-headline-md text-headline-md text-on-surface font-semibold mt-1">{title}</h3>
                    </div>

                    {e.state === "available" && (
                      <span className="font-telemetry-label text-telemetry-label text-on-tertiary-container bg-tertiary-container px-space-sm py-1 rounded shadow-sm font-bold flex items-center gap-1.5 animate-pulse h-fit whitespace-nowrap">
                        <span className="w-2 h-2 rounded-full bg-tertiary-fixed"></span>
                        LIVE NOW
                      </span>
                    )}
                    {e.state === "in_progress" && (
                      <span className="font-telemetry-label text-telemetry-label text-secondary bg-secondary-container/30 px-space-sm py-1 rounded font-bold h-fit whitespace-nowrap">
                        IN PROGRESS
                      </span>
                    )}
                    {e.state === "upcoming" && (
                      <span className="font-telemetry-label text-telemetry-label text-on-surface-variant bg-surface-container-highest px-space-sm py-1 rounded font-semibold flex items-center gap-1 h-fit">
                        <span className="material-symbols-outlined text-[14px]">lock</span>
                        LOCKED
                      </span>
                    )}
                    {e.state === "finished" && (
                      <span className="font-telemetry-label text-telemetry-label text-tertiary bg-tertiary-container/30 px-space-sm py-1 rounded font-bold h-fit">
                        COMPLETED
                      </span>
                    )}
                    {e.state === "closed" && (
                      <span className="font-telemetry-label text-telemetry-label text-error bg-error-container/40 px-space-sm py-1 rounded font-bold h-fit">
                        CLOSED
                      </span>
                    )}
                  </div>

                  <div className={`grid grid-cols-3 gap-space-xs p-space-sm rounded-lg text-center ${active ? "bg-surface-container-low" : "bg-surface-container"}`}>
                    <div className="flex flex-col">
                      <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">DURATION</span>
                      <span className="font-code-md text-code-md text-on-surface font-bold">{e.duration_minutes} Mins</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">CHALLENGES</span>
                      <span className="font-code-md text-code-md text-on-surface font-bold">
                        {e.problem_count} {e.problem_count === 1 ? "Problem" : "Problems"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">TOTAL POINTS</span>
                      <span className="font-code-md text-code-md text-on-surface font-bold">{e.max_score} Pts</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between font-body-sm text-body-sm bg-surface-container-highest/40 px-space-sm py-1 rounded">
                    <span className="text-on-surface-variant flex items-center gap-1">
                      <span className={`material-symbols-outlined text-[16px] ${active ? "text-tertiary" : "text-outline"}`}>
                        {active ? "code" : "event"}
                      </span>
                      {active ? "Run the samples first, then submit for full grading" : windowText(e)}
                    </span>
                    {e.state === "available" && (
                      <span className="font-telemetry-label text-telemetry-label text-tertiary font-bold">READY</span>
                    )}
                  </div>
                </div>

                <div className="mt-space-lg pt-space-md flex items-center justify-between gap-space-md">
                  {footer}

                  {active ? (
                    <Link
                      to={`/exam/coding/${e.id}`}
                      className="px-space-lg py-space-sm rounded-lg bg-tertiary text-on-tertiary font-headline-md text-body-md font-bold shadow-lg hover:opacity-90 active:scale-95 transition-all flex items-center gap-space-xs whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-[20px]">terminal</span>
                      <span>{e.state === "in_progress" ? "Resume Coding Test" : "Enter Coding Test"}</span>
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="px-space-md py-space-sm rounded-lg bg-surface-container-highest text-on-surface-variant font-body-md text-body-md font-semibold cursor-not-allowed opacity-60 flex items-center gap-1 whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {e.state === "finished" ? "task_alt" : "lock"}
                      </span>
                      <span>{e.state === "finished" ? "Submitted" : e.state === "closed" ? "Window Closed" : "Locked"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}