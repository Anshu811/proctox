import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import WelcomeBar from "./sections/WelcomeBar";
import MetricCards from "./sections/MetricCards";
import McqAssessments from "./sections/McqAssessments";
import CodingAssessments from "./sections/CodingAssessments";
import ResultsTable from "./sections/ResultsTable";
import SystemCheck from "./sections/SystemCheck";

// What the student can do with an exam right now:
//   finished    - already submitted (or auto-submitted)
//   in_progress - started but not submitted yet
//   upcoming    - the start time is still in the future
//   closed      - the end time has passed and the student never started
//   available   - can be started now
function decorate(exam, now) {
  let state;
  if (exam.attempt_status && exam.attempt_status !== "in_progress") state = "finished";
  else if (exam.attempt_status === "in_progress") state = "in_progress";
  else if (exam.start_time && now < new Date(exam.start_time)) state = "upcoming";
  else if (exam.end_time && now > new Date(exam.end_time)) state = "closed";
  else state = "available";

  const percent =
    state === "finished" && exam.max_score > 0 && exam.score !== null
      ? Math.max(0, Math.min(100, (exam.score / exam.max_score) * 100))
      : null;

  return { ...exam, state, percent };
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setData(await api("/student/overview"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const view = useMemo(() => {
    if (!data) return null;
    const now = new Date(data.now);
    const exams = data.exams.map((e) => decorate(e, now));

    const finished = exams
      .filter((e) => e.state === "finished")
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    const percents = finished.map((e) => e.percent).filter((p) => p !== null);

    const stats = {
      finishedCount: finished.length,
      averagePercent: percents.length
        ? Math.round((percents.reduce((s, p) => s + p, 0) / percents.length) * 10) / 10
        : null,
      openCount: exams.filter((e) => e.state === "available" || e.state === "in_progress").length,
      upcomingCount: exams.filter((e) => e.state === "upcoming").length,
    };

    const nextExam =
      exams.find((e) => e.state === "in_progress") ||
      exams.find((e) => e.state === "available") ||
      exams
        .filter((e) => e.state === "upcoming")
        .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0] ||
      null;

    return {
      stats,
      nextExam,
      mcqExams: exams.filter((e) => e.type === "mcq"),
      codingExams: exams.filter((e) => e.type === "coding"),
      results: finished,
    };
  }, [data]);

  return (
    <div className="px-gutter-lg py-space-lg flex flex-col gap-space-xl max-w-7xl mx-auto w-full">
      <WelcomeBar user={user} />

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-space-md px-space-md py-space-sm rounded-xl bg-error-container/30 text-on-error-container"
        >
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-error text-[20px]">warning</span>
            <span>Could not load your exams: {error}</span>
          </div>
          <button
            onClick={load}
            className="px-space-sm py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !view && (
        <div role="status" className="flex items-center justify-center gap-space-sm py-space-xl text-on-surface-variant">
          <span className="material-symbols-outlined text-primary text-[28px] animate-spin">progress_activity</span>
          <span>Loading your exams...</span>
        </div>
      )}

      {view && (
        <>
          <MetricCards stats={view.stats} nextExam={view.nextExam} />
          <section id="mcq" className="scroll-mt-20">
            <McqAssessments exams={view.mcqExams} />
          </section>
          <section id="coding" className="scroll-mt-20">
            <CodingAssessments exams={view.codingExams} />
          </section>
          <section id="results" className="scroll-mt-20">
            <ResultsTable results={view.results} />
          </section>
        </>
      )}

      <SystemCheck />
    </div>
  );
}