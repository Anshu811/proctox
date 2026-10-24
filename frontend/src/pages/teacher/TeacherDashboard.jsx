import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

// ====== SETTINGS ======
const API = "http://localhost:5000/api";
const getToken = () => localStorage.getItem("token"); // key where your login saves the JWT
// ======================

async function api(path, { method = "GET" } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || "Request failed");
    err.status = res.status;
    throw err;
  }
  return data;
}

const STATUS = {
  in_progress: { label: "In progress", cls: "bg-secondary-container/30 text-secondary" },
  submitted: { label: "Submitted", cls: "bg-tertiary-container/30 text-tertiary" },
  auto_submitted: { label: "Auto-submitted", cls: "bg-error-container/40 text-error" },
};

const SUBMISSION_STATUS = {
  accepted: { label: "Accepted", cls: "bg-tertiary-container/30 text-tertiary" },
  wrong_answer: { label: "Wrong answer", cls: "bg-error-container/40 text-error" },
  compile_error: { label: "Compilation error", cls: "bg-error-container/40 text-error" },
  runtime_error: { label: "Runtime error", cls: "bg-error-container/40 text-error" },
  time_limit: { label: "Time limit exceeded", cls: "bg-error-container/40 text-error" },
  error: { label: "Judge error", cls: "bg-surface-container-highest text-on-surface-variant" },
  no_tests: { label: "No test cases", cls: "bg-surface-container-highest text-on-surface-variant" },
};

const VIOLATION_LABELS = { tab_switch: "Tab switch" };

const fmtDate = (d) => (d ? new Date(d).toLocaleString() : "-");
const pctOf = (score, max) =>
  max > 0 && score !== null ? Math.max(0, Math.min(100, (score / max) * 100)) : 0;
const round1 = (n) => Math.round(n * 10) / 10;

export default function TeacherDashboard() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [view, setView] = useState("exams"); // exams | results | attempt
  const [exams, setExams] = useState([]);
  const [resultsData, setResultsData] = useState(null); // { exam, results }
  const [detail, setDetail] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login"; // full reload so any auth state is reset
  };

  // Verify the user and load the exam list
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { user } = await api("/auth/me");
        if (cancelled) return;
        setMe(user);
        if (user.role === "teacher") {
          const data = await api("/teacher/exams");
          if (!cancelled) setExams(data.exams);
        }
      } catch (e) {
        if (cancelled) return;
        if (e.status === 401) navigate("/login");
        else setError(e.message);
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const openExam = useCallback(async (examId) => {
    setBusy(true);
    setError("");
    try {
      const data = await api(`/teacher/exams/${examId}/results`);
      setResultsData(data);
      setSearch("");
      setStatusFilter("all");
      setView("results");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const openAttempt = useCallback(async (attemptId) => {
    setBusy(true);
    setError("");
    try {
      const data = await api(`/teacher/attempts/${attemptId}`);
      setDetail(data);
      setView("attempt");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }, []);

  const refreshExams = async () => {
    setBusy(true);
    try {
      const data = await api("/teacher/exams");
      setExams(data.exams);
      setView("exams");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const deleteExam = async (examId) => {
    if (!window.confirm("Delete this exam and all of its questions? This cannot be undone.")) return;
    setBusy(true);
    setError("");
    try {
      await api(`/teacher/exams/${examId}`, { method: "DELETE" });
      await refreshExams();
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };

  // ---- Derived data for the results view ----
  const rows = resultsData?.results || [];
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!term) return true;
      return r.name.toLowerCase().includes(term) || r.email.toLowerCase().includes(term);
    });
  }, [rows, search, statusFilter]);

  const exportCsv = () => {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Rank", "Name", "Email", "Status", "Score", "Max score", "Warnings", "Started", "Submitted"];
    const lines = filteredRows.map((r, i) =>
      [
        i + 1,
        r.name,
        r.email,
        STATUS[r.status]?.label || r.status,
        r.score ?? "",
        resultsData.exam.max_score,
        r.violation_count,
        fmtDate(r.started_at),
        fmtDate(r.submitted_at),
      ]
        .map(esc)
        .join(",")
    );
    const blob = new Blob([[header.map(esc).join(","), ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resultsData.exam.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-results.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- Screens ----
  if (booting)
    return (
      <Screen>
        <Icon name="progress_activity" className="text-primary text-[32px] animate-spin" />
        <p className="text-on-surface-variant">Loading...</p>
      </Screen>
    );

  if (me && me.role !== "teacher")
    return (
      <Screen>
        <Icon name="lock" className="text-error text-[36px]" />
        <h2 className="font-headline-md text-headline-md">Teachers only</h2>
        <p className="text-on-surface-variant">
          This area is for teacher accounts. If your role was changed recently, log out and log in again.
        </p>
        <div className="flex gap-space-sm">
          <button
            onClick={() => navigate("/student")}
            className="px-space-md py-space-xs rounded-lg bg-surface-container-highest hover:bg-surface-bright font-semibold"
          >
            Student dashboard
          </button>
          <button
            onClick={logout}
            className="px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary-container font-semibold hover:brightness-110"
          >
            Log out
          </button>
        </div>
      </Screen>
    );

  if (!me)
    return (
      <Screen>
        <Icon name="error" className="text-error text-[36px]" />
        <p className="text-error">{error || "Could not load your account"}</p>
        <button
          onClick={() => navigate("/login")}
          className="px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary-container font-semibold hover:brightness-110"
        >
          Go to login
        </button>
      </Screen>
    );

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md text-body-md antialiased selection:bg-primary selection:text-on-primary">
      {/* ================= TOP BAR ================= */}
      <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-gutter-lg bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/20">
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
            <Icon name="shield_lock" className="text-on-primary-container text-[20px]" />
          </div>
          <span className="font-headline-md text-headline-md tracking-tight">ProctoX</span>
          <span className="hidden md:inline font-telemetry-label text-[10px] text-secondary bg-secondary-container/30 px-2 py-0.5 rounded ml-space-xs uppercase">
            Teacher Console
          </span>
        </div>
        <div className="flex items-center gap-space-md">
          <div className="hidden sm:flex flex-col text-right leading-tight">
            <span className="font-semibold">{me.name}</span>
            <span className="font-telemetry-label text-[10px] text-on-surface-variant uppercase">{me.email}</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <Icon name="logout" className="text-[18px]" />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-gutter-lg py-space-lg flex flex-col gap-space-lg">
        {/* ================= BREADCRUMB ================= */}
        <nav className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant flex-wrap">
          <button onClick={refreshExams} className="hover:text-on-surface flex items-center gap-1">
            <Icon name="dashboard" className="text-[16px]" /> Exams
          </button>
          {view !== "exams" && resultsData && (
            <>
              <Icon name="chevron_right" className="text-[16px]" />
              <button
                onClick={() => setView("results")}
                className={view === "results" ? "text-on-surface font-semibold" : "hover:text-on-surface"}
              >
                {resultsData.exam.title}
              </button>
            </>
          )}
          {view === "attempt" && detail && (
            <>
              <Icon name="chevron_right" className="text-[16px]" />
              <span className="text-on-surface font-semibold">{detail.attempt.name}</span>
            </>
          )}
          {busy && <Icon name="progress_activity" className="text-primary text-[16px] animate-spin ml-space-sm" />}
        </nav>

        {error && (
          <div role="alert" className="flex items-center justify-between gap-space-md px-space-md py-space-sm rounded-xl bg-error-container/30 text-on-error-container">
            <div className="flex items-center gap-space-sm">
              <Icon name="warning" className="text-error text-[20px]" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} aria-label="Dismiss" className="p-1 rounded-lg hover:bg-error-container/50">
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>
        )}

        {/* ================= VIEW: EXAMS ================= */}
        {view === "exams" && (
          <section className="flex flex-col gap-space-md">
            <div className="flex flex-wrap items-end justify-between gap-space-md">
              <div>
                <h1 className="font-headline-lg text-headline-lg">Your exams</h1>
                <p className="text-on-surface-variant">Pick an exam to see every student's result.</p>
              </div>
              <div className="flex flex-wrap items-center gap-space-sm">
                <button
                  onClick={() => navigate("/teacher/exams/new")}
                  className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary-container font-semibold shadow-md hover:brightness-110 active:scale-95 transition-all"
                >
                  <Icon name="add" className="text-[20px]" />
                  <span>Create MCQ exam</span>
                </button>
                <button
                  onClick={() => navigate("/teacher/exams/new-coding")}
                  className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-tertiary text-on-tertiary font-semibold shadow-md hover:brightness-110 active:scale-95 transition-all"
                >
                  <Icon name="code" className="text-[20px]" />
                  <span>Create coding exam</span>
                </button>
              </div>
            </div>

            {exams.length === 0 ? (
              <Empty icon="quiz" text="No exams found." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-space-md">
                {exams.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => openExam(e.id)}
                    className="text-left bg-surface-container-low hover:bg-surface-container rounded-xl p-space-lg shadow-lg transition-all hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary flex flex-col gap-space-md"
                  >
                    <div className="flex items-start justify-between gap-space-sm">
                      <div className="flex items-center gap-space-sm min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-surface-container-high text-primary flex items-center justify-center shrink-0">
                          <Icon name={e.type === "coding" ? "code" : "checklist"} className="text-[22px]" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-headline-md text-body-lg font-semibold truncate">{e.title}</h3>
                          <span className="font-telemetry-label text-[10px] text-on-surface-variant uppercase">
                            {e.course_code || "No course code"}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`shrink-0 font-telemetry-label text-[10px] px-2 py-0.5 rounded uppercase ${
                          e.type === "coding" ? "bg-secondary-container/30 text-secondary" : "bg-primary-container/30 text-primary-fixed"
                        }`}
                      >
                        {e.type}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-space-sm text-center">
                      <Stat label="Attempts" value={e.attempts} />
                      <Stat label="Finished" value={e.finished} />
                      <Stat label="Average" value={e.avg_score === null ? "-" : `${round1(e.avg_score)}/${e.max_score}`} />
                    </div>

                    <div className="flex items-center justify-between text-on-surface-variant font-body-sm text-body-sm">
                      <span className="flex items-center gap-1">
                        <Icon name="timer" className="text-[16px]" /> {e.duration_minutes} min
                      </span>
                      <span className="flex items-center gap-1 text-primary">
                        View results <Icon name="arrow_forward" className="text-[16px]" />
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ================= VIEW: RESULTS ================= */}
        {view === "results" && resultsData && (
          <ResultsView
            data={resultsData}
            rows={rows}
            filteredRows={filteredRows}
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            onOpen={openAttempt}
            onExport={exportCsv}
            onDelete={() => deleteExam(resultsData.exam.id)}
          />
        )}

        {/* ================= VIEW: ATTEMPT DETAIL ================= */}
        {view === "attempt" && detail && resultsData && (
          <AttemptView detail={detail} max={resultsData.exam.max_score} onBack={() => setView("results")} />
        )}
      </div>
    </div>
  );
}

/* ---------------- Results view ---------------- */

function ResultsView({ data, rows, filteredRows, search, setSearch, statusFilter, setStatusFilter, onOpen, onExport, onDelete }) {
  const { exam } = data;
  const finished = rows.filter((r) => r.status !== "in_progress" && r.score !== null);
  const avg = finished.length ? finished.reduce((s, r) => s + r.score, 0) / finished.length : null;
  const highest = finished.length ? Math.max(...finished.map((r) => r.score)) : null;
  const flagged = rows.filter((r) => r.violation_count > 0).length;

  return (
    <section className="flex flex-col gap-space-md">
      <div className="flex flex-wrap items-end justify-between gap-space-md">
        <div>
          <span className="font-telemetry-label text-telemetry-label text-primary uppercase tracking-wider">
            {exam.type === "coding" ? "Coding assessment" : "MCQ assessment"}
          </span>
          <h1 className="font-headline-lg text-headline-lg">{exam.title}</h1>
        </div>
        <div className="flex items-center gap-space-sm">
          {rows.length === 0 && (
            <button
              onClick={onDelete}
              className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg border border-error/40 text-error hover:bg-error-container/30 font-semibold transition-all"
            >
              <Icon name="delete" className="text-[18px]" />
              <span>Delete exam</span>
            </button>
          )}
          <button
            onClick={onExport}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-tertiary font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="download" className="text-[18px]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        <BigStat icon="groups" label="Participants" value={rows.length} tone="text-primary" />
        <BigStat icon="task_alt" label="Finished" value={finished.length} tone="text-tertiary" />
        <BigStat
          icon="query_stats"
          label="Average / Highest"
          value={avg === null ? "-" : `${round1(avg)} / ${highest}`}
          sub={`out of ${exam.max_score}`}
          tone="text-secondary"
        />
        <BigStat icon="flag" label="Flagged students" value={flagged} sub="1 or more warnings" tone={flagged ? "text-error" : "text-on-surface-variant"} />
      </div>

      <div className="bg-surface-container-low rounded-xl shadow-lg overflow-hidden">
        <div className="flex flex-wrap items-center gap-space-sm p-space-md bg-surface-container">
          <div className="relative flex-1 min-w-[220px]">
            <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              aria-label="Search students"
              className="w-full pl-10 pr-3 py-2 rounded-lg bg-surface-container-lowest text-on-surface placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="px-space-sm py-2 rounded-lg bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All statuses</option>
            <option value="in_progress">In progress</option>
            <option value="submitted">Submitted</option>
            <option value="auto_submitted">Auto-submitted</option>
          </select>
          <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">
            {filteredRows.length} of {rows.length} shown
          </span>
        </div>

        {filteredRows.length === 0 ? (
          <Empty icon="person_search" text={rows.length === 0 ? "No student has started this exam yet." : "No students match your filters."} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="font-telemetry-label text-telemetry-label text-on-surface-variant uppercase">
                  <th className="px-space-md py-space-sm">#</th>
                  <th className="px-space-md py-space-sm">Student</th>
                  <th className="px-space-md py-space-sm">Status</th>
                  <th className="px-space-md py-space-sm min-w-[180px]">Score</th>
                  <th className="px-space-md py-space-sm">Warnings</th>
                  <th className="px-space-md py-space-sm">Submitted</th>
                  <th className="px-space-md py-space-sm" />
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, i) => {
                  const st = STATUS[r.status] || { label: r.status, cls: "bg-surface-container text-on-surface-variant" };
                  const pct = pctOf(r.score, exam.max_score);
                  return (
                    <tr key={r.attempt_id} className="border-t border-outline-variant/15 hover:bg-surface-container/60 transition-colors">
                      <td className="px-space-md py-space-sm text-on-surface-variant font-telemetry-label">{i + 1}</td>
                      <td className="px-space-md py-space-sm">
                        <div className="font-semibold">{r.name}</div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">{r.email}</div>
                      </td>
                      <td className="px-space-md py-space-sm">
                        <span className={`font-telemetry-label text-[10px] px-2 py-0.5 rounded uppercase whitespace-nowrap ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-space-md py-space-sm">
                        <div className="flex items-center gap-space-sm">
                          <span className="font-telemetry-label font-bold w-20 shrink-0">
                            {r.score === null ? "-" : round1(r.score)} / {exam.max_score}
                          </span>
                          <div className="flex-1 h-1.5 rounded-full bg-surface-container-highest overflow-hidden min-w-[60px]">
                            <div
                              className={`h-full ${pct >= 75 ? "bg-tertiary" : pct >= 40 ? "bg-secondary" : "bg-error"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-space-md py-space-sm">
                        <span
                          className={`inline-flex items-center gap-1 font-telemetry-label ${
                            r.violation_count > 0 ? "text-error" : "text-on-surface-variant"
                          }`}
                        >
                          {r.violation_count > 0 && <Icon name="warning" className="text-[14px]" />}
                          {r.violation_count}
                        </span>
                      </td>
                      <td className="px-space-md py-space-sm text-on-surface-variant font-body-sm text-body-sm whitespace-nowrap">
                        {fmtDate(r.submitted_at)}
                      </td>
                      <td className="px-space-md py-space-sm text-right">
                        <button
                          onClick={() => onOpen(r.attempt_id)}
                          className="px-space-sm py-1 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-semibold text-body-sm"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Attempt detail view ---------------- */

function AttemptView({ detail, max, onBack }) {
  const { attempt, violations } = detail;
  const st = STATUS[attempt.status] || { label: attempt.status, cls: "bg-surface-container text-on-surface-variant" };
  const pct = pctOf(attempt.score, max);

  return (
    <section className="flex flex-col gap-space-md">
      <button
        onClick={onBack}
        className="self-start flex items-center gap-space-xs text-on-surface-variant hover:text-on-surface"
      >
        <Icon name="arrow_back" className="text-[18px]" /> Back to results
      </button>

      <div className="bg-surface-container-low rounded-xl p-space-lg shadow-lg flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-md min-w-0">
          <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-headline-md text-headline-md shrink-0">
            {attempt.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="font-headline-lg text-headline-lg truncate">{attempt.name}</h1>
            <p className="text-on-surface-variant truncate">{attempt.email}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-space-md">
          <div className="text-center">
            <div className={`font-headline-xl text-headline-xl leading-none ${pct >= 75 ? "text-tertiary" : pct >= 40 ? "text-secondary" : "text-error"}`}>
              {attempt.score === null ? "-" : round1(attempt.score)}
              <span className="text-body-lg font-normal text-on-surface-variant"> / {max}</span>
            </div>
            <span className="font-telemetry-label text-[10px] text-on-surface-variant uppercase">Final score</span>
          </div>
          <span className={`font-telemetry-label text-[11px] px-3 py-1 rounded uppercase ${st.cls}`}>{st.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        <BigStat icon="schedule" label="Started" value={fmtDate(attempt.started_at)} small />
        <BigStat icon="event_available" label="Submitted" value={fmtDate(attempt.submitted_at)} small />
        <BigStat icon="quiz" label="Exam" value={attempt.title} small />
        <BigStat
          icon="warning"
          label="Warnings"
          value={attempt.violation_count}
          tone={attempt.violation_count ? "text-error" : "text-tertiary"}
        />
      </div>

      {/* Violations */}
      <div className="bg-surface-container-low rounded-xl p-space-lg shadow-lg flex flex-col gap-space-sm">
        <h2 className="font-headline-md text-headline-md flex items-center gap-space-xs">
          <Icon name="policy" className="text-secondary text-[22px]" /> Proctoring log
        </h2>
        {violations.length === 0 ? (
          <p className="text-on-surface-variant flex items-center gap-space-xs">
            <Icon name="verified_user" className="text-tertiary text-[18px]" /> No violations were recorded.
          </p>
        ) : (
          <ul className="flex flex-col gap-space-xs">
            {violations.map((v, i) => (
              <li key={i} className="flex items-center justify-between gap-space-sm px-space-sm py-space-xs rounded-lg bg-error-container/15">
                <span className="flex items-center gap-space-xs text-error">
                  <Icon name="tab_unselected" className="text-[18px]" />
                  {VIOLATION_LABELS[v.type] || v.type}
                </span>
                <span className="font-telemetry-label text-[11px] text-on-surface-variant">{fmtDate(v.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {detail.answers && <McqAnswers answers={detail.answers} />}
      {detail.submissions && <CodeSubmissions submissions={detail.submissions} />}
    </section>
  );
}

function McqAnswers({ answers }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-space-lg shadow-lg flex flex-col gap-space-md">
      <h2 className="font-headline-md text-headline-md flex items-center gap-space-xs">
        <Icon name="checklist" className="text-primary text-[22px]" /> Answer sheet
      </h2>
      {answers.map((a, i) => {
        const skipped = a.selected_index === null;
        const correct = !skipped && a.selected_index === a.correct_index;
        const tone = skipped ? "text-on-surface-variant" : correct ? "text-tertiary" : "text-error";
        const label = skipped ? "Skipped" : correct ? "Correct" : "Wrong";
        return (
          <div key={a.id} className="bg-surface-container rounded-lg p-space-md flex flex-col gap-space-sm">
            <div className="flex items-start justify-between gap-space-sm">
              <p className="font-semibold whitespace-pre-wrap">
                <span className="text-on-surface-variant font-telemetry-label mr-2">Q{i + 1}</span>
                {a.question_text}
              </p>
              <span className={`shrink-0 font-telemetry-label text-[11px] uppercase font-bold ${tone}`}>{label}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm font-body-sm text-body-sm">
              <div className="rounded-lg bg-surface-container-lowest p-space-sm">
                <span className="block font-telemetry-label text-[10px] text-on-surface-variant uppercase">Student answer</span>
                <span className={tone}>
                  {skipped ? "Not answered" : `${String.fromCharCode(65 + a.selected_index)}. ${a.options[a.selected_index]}`}
                </span>
              </div>
              <div className="rounded-lg bg-surface-container-lowest p-space-sm">
                <span className="block font-telemetry-label text-[10px] text-on-surface-variant uppercase">Correct answer</span>
                <span className="text-tertiary">
                  {String.fromCharCode(65 + a.correct_index)}. {a.options[a.correct_index]}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CodeSubmissions({ submissions }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-space-lg shadow-lg flex flex-col gap-space-md">
      <h2 className="font-headline-md text-headline-md flex items-center gap-space-xs">
        <Icon name="code" className="text-primary text-[22px]" /> Code submissions
      </h2>
      {submissions.length === 0 && <p className="text-on-surface-variant">This student did not submit any code.</p>}
      {submissions.map((s) => {
        const st = SUBMISSION_STATUS[s.status] || { label: s.status, cls: "bg-surface-container-highest text-on-surface-variant" };
        return (
          <details key={s.id} className="bg-surface-container rounded-lg">
            <summary className="cursor-pointer list-none p-space-md flex flex-wrap items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm min-w-0">
                <Icon name="chevron_right" className="text-[18px] text-on-surface-variant" />
                <span className="font-semibold truncate">{s.problem_title}</span>
                <span className="font-telemetry-label text-[10px] px-2 py-0.5 rounded bg-surface-container-highest uppercase">
                  {s.language === "cpp" ? "C++" : s.language}
                </span>
              </div>
              <div className="flex items-center gap-space-sm">
                <span className="font-telemetry-label text-[11px] text-on-surface-variant">
                  {s.passed_cases}/{s.total_cases} tests
                </span>
                <span className="font-telemetry-label text-[11px] font-bold">+{s.score}</span>
                <span className={`font-telemetry-label text-[10px] px-2 py-0.5 rounded uppercase ${st.cls}`}>{st.label}</span>
                <span className="font-telemetry-label text-[11px] text-on-surface-variant">{fmtDate(s.created_at)}</span>
              </div>
            </summary>
            <pre className="m-space-md mt-0 p-space-md rounded-lg bg-surface-container-lowest font-code-md text-code-md whitespace-pre overflow-x-auto">
              {s.code}
            </pre>
          </details>
        );
      })}
    </div>
  );
}

/* ---------------- small UI pieces ---------------- */

function Icon({ name, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function Screen({ children }) {
  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md text-body-md flex items-center justify-center p-space-md">
      <div className="w-full max-w-md bg-surface-container rounded-xl p-space-lg shadow-2xl flex flex-col gap-space-md items-center text-center">
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-surface-container rounded-lg p-space-sm">
      <span className="block font-bold text-body-lg leading-tight">{value}</span>
      <span className="font-telemetry-label text-[10px] text-on-surface-variant uppercase">{label}</span>
    </div>
  );
}

function BigStat({ icon, label, value, sub, tone = "text-on-surface", small }) {
  return (
    <div className="bg-surface-container-low rounded-xl p-space-md shadow-lg flex items-center gap-space-md min-w-0">
      <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
        <Icon name={icon} className={`${tone} text-[22px]`} />
      </div>
      <div className="min-w-0">
        <span className="block font-telemetry-label text-[10px] text-on-surface-variant uppercase">{label}</span>
        <span className={`block font-bold leading-tight ${small ? "text-body-md truncate" : `text-headline-md ${tone}`}`}>{value}</span>
        {sub && <span className="block font-body-sm text-[11px] text-on-surface-variant">{sub}</span>}
      </div>
    </div>
  );
}

function Empty({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center gap-space-xs py-space-xl text-on-surface-variant">
      <Icon name={icon} className="text-[32px] text-outline" />
      <span>{text}</span>
    </div>
  );
}