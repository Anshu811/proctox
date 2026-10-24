const EMPTY_STATS = { finishedCount: 0, averagePercent: null, openCount: 0, upcomingCount: 0 };

// "IN 3 HRS", "IN 20 MIN", "IN 2 DAYS"
function untilText(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "NOW";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `IN ${Math.max(mins, 1)} MIN`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `IN ${hrs} ${hrs === 1 ? "HR" : "HRS"}`;
  const days = Math.floor(hrs / 24);
  return `IN ${days} ${days === 1 ? "DAY" : "DAYS"}`;
}

const sizeText = (exam) =>
  exam.type === "mcq" ? `${exam.question_count} questions` : `${exam.problem_count} problems`;

export default function MetricCards({ stats = EMPTY_STATS, nextExam = null }) {
  const { finishedCount, averagePercent, openCount, upcomingCount } = stats;

  const cardOneValue =
    openCount > 0 ? `${openCount} Open` : upcomingCount > 0 ? `${upcomingCount} Upcoming` : "None open";

  // Details shown inside card 1 for the most relevant exam
  let chip = null;
  let chipClass = "text-error bg-error-container/40";
  let footer = "";
  let barPercent = null;

  if (nextExam) {
    if (nextExam.state === "in_progress") {
      chip = "IN PROGRESS";
      chipClass = "text-secondary bg-secondary-container/30";
      const total = nextExam.duration_minutes * 60;
      barPercent = total > 0 ? Math.max(0, Math.min(100, (nextExam.seconds_left / total) * 100)) : 0;
      footer = `About ${Math.ceil(nextExam.seconds_left / 60)} min were left when this page loaded`;
    } else if (nextExam.state === "available") {
      chip = "READY TO START";
      chipClass = "text-tertiary bg-tertiary-container/30";
      footer = `${nextExam.duration_minutes} min | ${sizeText(nextExam)}`;
    } else if (nextExam.state === "upcoming") {
      chip = untilText(nextExam.start_time);
      footer = `Starts ${new Date(nextExam.start_time).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}`;
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
      {/* Card 1: Open / upcoming */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-lg flex flex-col justify-between hover:bg-surface-container-high transition-all">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary"></div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-telemetry-label text-telemetry-label text-on-surface-variant uppercase">Open Exams</span>
            <span className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight mt-1">{cardOneValue}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary shadow-sm">
            <span className="material-symbols-outlined text-[26px]">calendar_clock</span>
          </div>
        </div>

        <div className="mt-space-md bg-surface-container-lowest/60 p-space-sm rounded-lg">
          {nextExam && chip ? (
            <>
              <div className="flex items-center justify-between text-on-surface">
                <span className="font-body-sm text-body-sm font-semibold truncate pr-2">{nextExam.title}</span>
                <span className={`font-telemetry-label text-telemetry-label font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${chipClass}`}>
                  {chip}
                </span>
              </div>
              {barPercent !== null && (
                <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-2 overflow-hidden">
                  <div className="bg-primary h-1.5 rounded-full" style={{ width: `${barPercent}%` }}></div>
                </div>
              )}
              <span className="font-telemetry-label text-telemetry-label text-on-surface-variant block mt-1">{footer}</span>
            </>
          ) : (
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              No exam is open right now. Check back later.
            </span>
          )}
        </div>
      </div>

      {/* Card 2: Completed */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-lg flex flex-col justify-between hover:bg-surface-container-high transition-all">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary-container to-secondary"></div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-telemetry-label text-telemetry-label text-on-surface-variant uppercase">Exam History</span>
            <span className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight mt-1">{finishedCount} Finished</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-secondary shadow-sm">
            <span className="material-symbols-outlined text-[26px]">task_alt</span>
          </div>
        </div>
        <div className="mt-space-md bg-surface-container-lowest/60 p-space-sm rounded-lg flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-body-sm text-body-sm text-on-surface font-medium">
              {finishedCount === 0 ? "Nothing graded yet" : `${finishedCount} graded`}
            </span>
            <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">
              {finishedCount === 0 ? "Finish an exam to see it here" : "See Recent Results below"}
            </span>
          </div>
          <span className="font-code-md text-code-md font-bold text-secondary bg-surface-container-highest px-2 py-1 rounded">
            AUTO
          </span>
        </div>
      </div>

      {/* Card 3: Average */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container p-space-lg shadow-lg flex flex-col justify-between hover:bg-surface-container-high transition-all">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-tertiary-container to-tertiary"></div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <span className="font-telemetry-label text-telemetry-label text-on-surface-variant uppercase">Average Score</span>
            <span className="font-headline-xl text-headline-xl text-tertiary font-bold tracking-tight mt-1">
              {averagePercent === null ? "-" : `${averagePercent}%`}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-tertiary shadow-sm">
            <span className="material-symbols-outlined text-[26px]">auto_graph</span>
          </div>
        </div>
        <div className="mt-space-md bg-surface-container-lowest/60 p-space-sm rounded-lg">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
            <span className="font-body-sm text-body-sm font-semibold text-on-surface">
              {averagePercent === null
                ? "Finish an exam to see your average"
                : `Across ${finishedCount} finished ${finishedCount === 1 ? "exam" : "exams"}`}
            </span>
          </div>
          {averagePercent !== null && (
            <div className="w-full bg-surface-container-highest rounded-full h-1.5 mt-2 overflow-hidden">
              <div className="bg-tertiary h-1.5 rounded-full" style={{ width: `${Math.max(0, Math.min(100, averagePercent))}%` }}></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}