import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

// ====== SETTINGS ======
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const getToken = () => localStorage.getItem("token"); // key where your login saves the JWT
// ======================

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

// Works with /exam/mcq (picks the first MCQ exam) and with /exam/1 (numeric id).
async function resolveExamId(raw) {
  const n = Number(raw);
  if (raw && Number.isInteger(n) && n > 0) return n;
  const type = raw && Number.isNaN(n) ? raw : "mcq";
  const { exams } = await api(`/exams?type=${encodeURIComponent(type)}`);
  if (!exams.length) throw new Error("No exam is available yet");
  return exams[0].id;
}

const fmt = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const pad2 = (n) => String(n).padStart(2, "0");

export default function McqExam() {
  const params = useParams();
  const rawExam = params.examId ?? params.id ?? params.type;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attemptId, setAttemptId] = useState(null);
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [marked, setMarked] = useState([]);
  const [visited, setVisited] = useState([]);
  const [current, setCurrent] = useState(0);
  const [filter, setFilter] = useState("all"); // all | answered | marked | pending
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [lastSaved, setLastSaved] = useState(null);
  const [result, setResult] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const deadlineRef = useRef(0);
  const doneRef = useRef(false);

  // Load the attempt: questions, saved answers and remaining time come from the server
  const loadAttempt = useCallback(async (id) => {
    const data = await api(`/attempts/${id}`);
    setExam(data.exam);
    setViolations(data.attempt.violations);
    if (data.attempt.status !== "in_progress") {
      doneRef.current = true;
      setResult(data.result);
      return;
    }
    setQuestions(data.questions);
    setAnswers(data.answers || {});
    setMarked(data.marked || []);
    setVisited(Object.keys(data.answers || {}).map(Number));
    setSecondsLeft(data.attempt.secondsLeft);
    deadlineRef.current = Date.now() + data.attempt.secondsLeft * 1000;
  }, []);

  // Start (or resume) the attempt
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const examId = await resolveExamId(rawExam);
        const { attemptId: id } = await api(`/exams/${examId}/start`, { method: "POST" });
        if (cancelled) return;
        setAttemptId(id);
        await loadAttempt(id);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rawExam, loadAttempt]);

  // Remember which questions the student has opened
  useEffect(() => {
    const q = questions[current];
    if (q) setVisited((v) => (v.includes(q.id) ? v : [...v, q.id]));
  }, [current, questions]);

  const submit = useCallback(async () => {
    if (!attemptId || doneRef.current) return;
    doneRef.current = true;
    setSubmitting(true);
    try {
      const data = await api(`/attempts/${attemptId}/submit`, { method: "POST" });
      setResult(data.result);
    } catch (e) {
      doneRef.current = false;
      setNotice(e.message);
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }, [attemptId]);

  // Countdown (starts from the server's remaining time)
  useEffect(() => {
    if (!questions.length || result) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(t);
        submit();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [questions.length, result, submit]);

  // Switching tabs counts as a violation (a page refresh or navigation must not count)
  useEffect(() => {
    if (!attemptId || !questions.length || result) return;

    // Browsers fire visibilitychange("hidden") while a page is unloading,
    // so remember that the page is going away and ignore that event.
    let unloading = false;
    const markUnloading = () => {
      unloading = true;
    };

    const onHide = async () => {
      if (document.visibilityState !== "hidden" || doneRef.current || unloading) return;
      try {
        const r = await api(`/attempts/${attemptId}/violation`, {
          method: "POST",
          body: { type: "tab_switch" },
        });
        setViolations(r.violations);
        if (r.finished) {
          doneRef.current = true;
          await loadAttempt(attemptId); // fetch the final result
        } else {
          setNotice(`Tab switch detected. Warning ${r.violations}.`);
        }
      } catch (e) {
        setNotice(e.message);
      }
    };

    window.addEventListener("beforeunload", markUnloading);
    window.addEventListener("pagehide", markUnloading);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", markUnloading);
      window.removeEventListener("pagehide", markUnloading);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [attemptId, questions.length, result, loadAttempt]);

  // ---- Answer / mark for review ----
  const saveChoice = async (qid, next) => {
    const prev = answers[qid];
    setAnswers((a) => {
      const copy = { ...a };
      if (next === null) delete copy[qid];
      else copy[qid] = next;
      return copy;
    });
    try {
      await api(`/attempts/${attemptId}/answer`, {
        method: "PUT",
        body: { questionId: qid, selectedIndex: next },
      });
      setLastSaved(new Date());
    } catch (e) {
      setNotice(e.message);
      setAnswers((a) => {
        const copy = { ...a };
        if (prev === undefined) delete copy[qid];
        else copy[qid] = prev;
        return copy;
      });
    }
  };

  // Clicking the selected option again clears it
  const select = (qid, index) => saveChoice(qid, answers[qid] === index ? null : index);
  const clearAnswer = (qid) => {
    if (answers[qid] !== undefined) saveChoice(qid, null);
  };

  const setReview = async (qid, value) => {
    setMarked((m) => (value ? (m.includes(qid) ? m : [...m, qid]) : m.filter((x) => x !== qid)));
    try {
      await api(`/attempts/${attemptId}/answer`, {
        method: "PUT",
        body: { questionId: qid, marked: value },
      });
      setLastSaved(new Date());
    } catch (e) {
      setNotice(e.message);
      setMarked((m) => (value ? m.filter((x) => x !== qid) : [...m, qid]));
    }
  };

  const goNext = () => setCurrent((c) => Math.min(c + 1, questions.length - 1));
  const goPrev = () => setCurrent((c) => Math.max(c - 1, 0));

  // Keyboard shortcuts: Alt+Right / Alt+Left, and 1-9 to pick an option
  useEffect(() => {
    if (!questions.length || result || confirming) return;
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const q = questions[current];
      if (e.altKey && e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.altKey && e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (!e.altKey && !e.ctrlKey && !e.metaKey && /^[1-9]$/.test(e.key)) {
        const idx = Number(e.key) - 1;
        if (q && idx < q.options.length) select(q.id, idx);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // ---- Screens ----
  if (loading)
    return (
      <Screen>
        <Icon name="progress_activity" className="text-primary text-[32px] animate-spin" />
        <p className="text-on-surface-variant">Loading exam...</p>
      </Screen>
    );

  if (error)
    return (
      <Screen>
        <Icon name="error" className="text-error text-[36px]" />
        <h2 className="font-headline-md text-headline-md">Could not start the exam</h2>
        <p className="text-error">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary-container font-semibold hover:brightness-110"
        >
          Go back
        </button>
      </Screen>
    );

  if (result)
    return (
      <Screen wide>
        <ResultView title={exam?.title} result={result} onBack={() => navigate(-1)} />
      </Screen>
    );

  const q = questions[current];
  const total = questions.length;
  const answeredCount = Object.keys(answers).length;
  const markedCount = marked.length;
  const unvisitedCount = questions.filter(
    (x) => !visited.includes(x.id) && answers[x.id] === undefined && !marked.includes(x.id)
  ).length;
  const pendingCount = total - answeredCount;
  const pct = total > 0 ? Math.round((answeredCount / total) * 100) : 0;
  const low = secondsLeft <= 60;
  const warnDanger = violations > 0;
  const isLast = current === total - 1;
  const isMarked = marked.includes(q.id);

  const shown = questions
    .map((x, i) => ({ x, i }))
    .filter(({ x }) => {
      if (filter === "answered") return answers[x.id] !== undefined;
      if (filter === "marked") return marked.includes(x.id);
      if (filter === "pending") return answers[x.id] === undefined;
      return true;
    });

  const filters = [
    { id: "all", label: `All (${total})` },
    { id: "answered", label: `Answered (${answeredCount})` },
    { id: "marked", label: `Marked (${markedCount})` },
    { id: "pending", label: `Pending (${pendingCount})` },
  ];

  const cellClass = (x, i) => {
    const base = "relative h-9 rounded-lg flex items-center justify-center font-bold transition-all hover:brightness-110";
    if (i === current)
      return `${base} bg-primary-container text-on-primary-container shadow-[0_0_12px_rgba(124,58,237,0.7)] scale-105`;
    if (marked.includes(x.id)) return `${base} bg-secondary-container text-on-secondary-container`;
    if (answers[x.id] !== undefined) return `${base} bg-tertiary-container text-on-tertiary`;
    return `${base} bg-surface-container-highest text-on-surface-variant font-medium hover:bg-surface-bright hover:text-on-surface`;
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md text-body-md antialiased selection:bg-primary selection:text-on-primary">
      {/* ================= BRAND BAR ================= */}
      <header className="h-14 flex items-center justify-between px-gutter-lg bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant/20">
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
            <Icon name="shield_lock" className="text-on-primary-container text-[20px]" />
          </div>
          <span className="font-headline-md text-headline-md tracking-tight">ProctoX</span>
          <span className="hidden md:inline font-telemetry-label text-[10px] text-tertiary bg-tertiary-container/30 px-2 py-0.5 rounded ml-space-xs uppercase">
            Live Session
          </span>
        </div>
        <span className="hidden sm:inline font-telemetry-label text-telemetry-label text-on-surface-variant uppercase">
          Secure Academic Assessment
        </span>
      </header>

      {/* ================= STICKY EXAM HEADER ================= */}
      <section className="sticky top-0 z-40 w-full bg-surface-container-lowest/95 backdrop-blur-md px-gutter-lg py-space-sm shadow-md">
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-surface-container-high text-primary shrink-0">
              <Icon name="dns" className="text-[22px]" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-space-xs min-w-0">
                <span className="font-headline-md text-body-md font-semibold truncate">{exam.title}</span>
                <span className="px-space-xs py-0.5 rounded text-[10px] font-telemetry-label uppercase bg-primary-container/30 text-primary-fixed whitespace-nowrap">
                  {exam.type}
                </span>
              </div>
              <span className="font-telemetry-label text-telemetry-label text-on-surface-variant uppercase tracking-wider">
                Question <span className="text-on-surface font-bold text-[13px]">{current + 1}</span> of {total}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-space-sm px-space-md py-space-xs rounded-xl bg-surface-container-low shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${low ? "bg-error" : "bg-tertiary"}`} />
              <span className={`relative inline-flex rounded-full h-3 w-3 ${low ? "bg-error" : "bg-tertiary"}`} />
            </span>
            <span className="hidden sm:inline font-telemetry-label text-telemetry-label text-on-surface-variant uppercase">
              Time Remaining:
            </span>
            <span className={`font-timer-display text-timer-display tracking-wider ${low ? "text-error" : "text-on-surface"}`}>
              {fmt(secondsLeft)}
            </span>
            <Icon name="lock_clock" className={`${low ? "text-error" : "text-primary"} text-[18px]`} />
          </div>

          <div className="flex items-center gap-space-md">
            <div className="hidden sm:flex items-center gap-space-xs px-space-sm py-1.5 rounded-lg bg-surface-container-low">
              <div className={`w-2 h-2 rounded-full ${warnDanger ? "bg-error" : "bg-tertiary"}`} />
              <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">Warnings:</span>
              <span className="font-telemetry-label text-telemetry-label text-on-surface font-bold">
                {violations} / {exam.maxViolations}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-telemetry-label uppercase ${
                  warnDanger ? "bg-error-container/40 text-error" : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {warnDanger ? "Warning" : "Normal"}
              </span>
            </div>

            <button
              onClick={() => setConfirming(true)}
              className="flex items-center gap-space-xs px-space-md py-2 rounded-lg bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-container font-headline-md text-body-sm font-semibold shadow-md hover:brightness-110 active:scale-95 transition-all"
            >
              <Icon name="task_alt" className="text-[18px]" />
              <span>Finish &amp; Submit Exam</span>
            </button>
          </div>
        </div>
      </section>

      {/* ================= INFO / NOTICE BANNER ================= */}
      <aside className="w-full bg-surface-container-low px-gutter-lg py-2">
        <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-space-md text-on-surface-variant">
          {notice ? (
            <div role="alert" className="flex items-center justify-between gap-space-sm w-full text-on-error-container">
              <div className="flex items-center gap-space-sm min-w-0">
                <Icon name="warning" className="text-error text-[18px] shrink-0" />
                <p className="font-body-sm text-body-sm">{notice}</p>
              </div>
              <button onClick={() => setNotice("")} aria-label="Dismiss" className="p-1 rounded-lg hover:bg-error-container/40 shrink-0">
                <Icon name="close" className="text-[16px]" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-space-sm min-w-0">
              <Icon name="verified_user" className="text-secondary text-[18px] shrink-0" />
              <p className="font-body-sm text-body-sm">
                <strong className="text-secondary font-medium">Tab monitoring is on:</strong> switching tabs or leaving
                this window counts as a warning. After {exam.maxViolations} warnings the exam is submitted automatically.
              </p>
            </div>
          )}
        </div>
      </aside>

      {/* ================= MAIN CONTENT ================= */}
      <div className="w-full max-w-[1720px] mx-auto px-gutter-lg py-space-lg">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
          {/* ---------- Question workspace ---------- */}
          <main className="lg:col-span-8 flex flex-col gap-space-md">
            <div className="bg-surface-container-low rounded-xl p-space-lg sm:p-space-xl shadow-xl relative overflow-hidden">
              <div className="absolute -top-16 -right-16 w-36 h-36 bg-primary-container/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-wrap items-center justify-between gap-space-sm mb-space-md pb-space-sm">
                <div className="flex flex-wrap items-center gap-space-xs font-telemetry-label text-telemetry-label">
                  <span className="px-space-sm py-1 rounded bg-surface-container-highest text-primary-fixed uppercase tracking-wider font-bold">
                    Question {current + 1}
                  </span>
                  <span className="px-space-sm py-1 rounded bg-surface-container text-on-surface-variant">Single Correct</span>
                  <span className="px-space-sm py-1 rounded bg-tertiary-container/30 text-on-tertiary-container font-semibold">
                    +{Number(q.marks).toFixed(2)} Marks
                  </span>
                  {q.negative > 0 && (
                    <span className="px-space-sm py-1 rounded bg-error-container/20 text-error">
                      -{Number(q.negative).toFixed(2)} Negative Marking
                    </span>
                  )}
                  {isMarked && (
                    <span className="px-space-sm py-1 rounded bg-secondary-container/40 text-secondary flex items-center gap-1">
                      <Icon name="flag" className="text-[13px]" /> Marked
                    </span>
                  )}
                </div>
                {q.topic && (
                  <div className="flex items-center gap-space-xs text-on-surface-variant font-body-sm text-body-sm min-w-0">
                    <Icon name="category" className="text-[16px] text-secondary shrink-0" />
                    <span className="truncate max-w-xs">{q.topic}</span>
                  </div>
                )}
              </div>

              <p className="font-body-lg text-body-lg text-on-surface leading-relaxed whitespace-pre-wrap mb-space-xl">
                {q.text}
              </p>

              <div role="radiogroup" aria-label="Question options" className="flex flex-col gap-space-md mb-space-xl">
                {q.options.map((opt, i) => {
                  const on = answers[q.id] === i;
                  return (
                    <button
                      key={i}
                      role="radio"
                      aria-checked={on}
                      onClick={() => select(q.id, i)}
                      className={`group w-full text-left flex items-center justify-between p-space-md sm:p-space-lg rounded-xl shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                        on
                          ? "bg-primary-container/15 hover:bg-primary-container/20 ring-1 ring-primary/40"
                          : "bg-surface-container hover:bg-surface-container-high"
                      }`}
                    >
                      <div className="flex items-center gap-space-md min-w-0">
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 font-code-lg text-code-lg font-bold transition-all ${
                            on
                              ? "bg-primary-container text-on-primary-container"
                              : "bg-surface-container-highest text-on-surface group-hover:bg-surface-bright"
                          }`}
                        >
                          {String.fromCharCode(65 + i)}
                        </div>
                        <span className="font-code-lg text-code-lg text-on-surface font-semibold tracking-wide whitespace-pre-wrap break-words">
                          {opt}
                        </span>
                      </div>
                      <div className="flex items-center shrink-0 pl-space-md">
                        {on ? (
                          <div className="w-5 h-5 rounded-full flex items-center justify-center bg-primary text-on-primary">
                            <Icon name="check" className="text-[16px] font-bold" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-surface-container-highest group-hover:bg-surface-bright" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap items-center justify-between gap-space-md pt-space-lg">
                <div className="flex items-center gap-space-sm">
                  <button
                    onClick={goPrev}
                    disabled={current === 0}
                    className="px-space-md py-2.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-body-md text-body-md font-medium transition-colors flex items-center gap-space-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon name="arrow_back" className="text-[18px]" />
                    <span>Previous</span>
                  </button>
                  <button
                    onClick={() => clearAnswer(q.id)}
                    disabled={answers[q.id] === undefined}
                    className="px-space-md py-2.5 rounded-lg bg-surface-container-highest/60 hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface font-body-md text-body-md font-medium transition-colors flex items-center gap-space-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon name="ink_eraser" className="text-[18px]" />
                    <span className="hidden sm:inline">Clear Response</span>
                  </button>
                </div>

                <div className="flex items-center gap-space-sm">
                  {isMarked ? (
                    <button
                      onClick={() => setReview(q.id, false)}
                      className="px-space-md py-2.5 rounded-lg bg-secondary-container/30 hover:bg-secondary-container/50 text-secondary font-body-md text-body-md font-semibold transition-colors flex items-center gap-space-xs"
                    >
                      <Icon name="flag" className="text-[18px]" />
                      <span>Remove Review Mark</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setReview(q.id, true);
                        if (!isLast) goNext();
                      }}
                      className="px-space-md py-2.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-tertiary-fixed font-body-md text-body-md font-semibold transition-colors flex items-center gap-space-xs"
                    >
                      <Icon name="flag" className="text-[18px]" />
                      <span>{isLast ? "Mark for Review" : "Mark for Review & Next"}</span>
                    </button>
                  )}

                  <button
                    onClick={() => (isLast ? setConfirming(true) : goNext())}
                    className="px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary-container hover:brightness-110 active:scale-95 shadow-md font-body-md text-body-md font-semibold transition-all flex items-center gap-space-xs"
                  >
                    <span>{isLast ? "Save & Finish" : "Save & Next"}</span>
                    <Icon name={isLast ? "task_alt" : "arrow_forward"} className="text-[18px]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Shortcuts + autosave */}
            <div className="bg-surface-container rounded-xl p-space-md flex flex-wrap items-center justify-between gap-space-md text-on-surface-variant font-telemetry-label text-telemetry-label">
              <div className="flex flex-wrap items-center gap-space-md">
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface">Alt</kbd>+
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface">&rarr;</kbd> Next
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface">Alt</kbd>+
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface">&larr;</kbd> Prev
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface">1-4</kbd> Pick Option
                </span>
              </div>
              <div className="flex items-center gap-space-sm">
                <span>
                  Auto-saved:{" "}
                  <span className="text-tertiary">{lastSaved ? lastSaved.toLocaleTimeString() : "on every click"}</span>
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
              </div>
            </div>
          </main>

          {/* ---------- Right panel ---------- */}
          <aside className="lg:col-span-4 flex flex-col gap-space-md">
            {/* Progress */}
            <div className="bg-surface-container-low rounded-xl p-space-md shadow-lg flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-space-xs">
                  <Icon name="analytics" className="text-primary text-[20px]" />
                  <span className="font-headline-md text-body-md font-semibold">Assessment Progress</span>
                </div>
                <span className="font-telemetry-label text-telemetry-label font-bold text-tertiary">{pct}% COMPLETED</span>
              </div>

              <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden flex">
                <div className="bg-tertiary h-full transition-all duration-500" style={{ width: `${total ? (answeredCount / total) * 100 : 0}%` }} />
                <div className="bg-secondary h-full transition-all duration-500" style={{ width: `${total ? (markedCount / total) * 100 : 0}%` }} />
              </div>

              <div className="grid grid-cols-4 gap-2 text-center pt-1 font-telemetry-label text-telemetry-label">
                <div className="bg-surface-container rounded-lg p-2">
                  <span className="block text-body-md font-bold text-tertiary">{answeredCount}</span>
                  <span className="text-[10px] text-on-surface-variant uppercase">Answered</span>
                </div>
                <div className="bg-surface-container rounded-lg p-2">
                  <span className="block text-body-md font-bold text-secondary">{markedCount}</span>
                  <span className="text-[10px] text-on-surface-variant uppercase">Review</span>
                </div>
                <div className="bg-surface-container rounded-lg p-2">
                  <span className="block text-body-md font-bold text-primary">1</span>
                  <span className="text-[10px] text-on-surface-variant uppercase">Current</span>
                </div>
                <div className="bg-surface-container rounded-lg p-2">
                  <span className="block text-body-md font-bold text-on-surface-variant">{unvisitedCount}</span>
                  <span className="text-[10px] text-on-surface-variant uppercase">Unvisited</span>
                </div>
              </div>
            </div>

            {/* Question matrix */}
            <div className="bg-surface-container-low rounded-xl p-space-md shadow-lg flex flex-col gap-space-md">
              <div className="flex items-center justify-between pb-space-xs">
                <span className="font-headline-md text-body-md font-semibold flex items-center gap-space-xs">
                  <Icon name="apps" className="text-[18px] text-on-surface-variant" />
                  Question Matrix
                </span>
                <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">Total: {total}</span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {filters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-2.5 py-1 rounded-md font-telemetry-label text-telemetry-label shrink-0 transition-colors ${
                      filter === f.id
                        ? "bg-primary-container text-on-primary-container"
                        : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 py-2 px-space-xs bg-surface-container rounded-lg text-[11px] font-telemetry-label text-on-surface-variant">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-tertiary-container" /><span>Answered</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-secondary-container" /><span>Marked for Review</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-primary-container shadow-[0_0_8px_rgba(124,58,237,0.5)]" /><span>Active Question</span></div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-surface-container-highest" /><span>Not Answered</span></div>
              </div>

              {shown.length === 0 ? (
                <p className="font-body-sm text-body-sm text-on-surface-variant py-space-sm text-center">
                  No questions in this filter.
                </p>
              ) : (
                <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 xl:grid-cols-8 gap-2 pt-1 font-telemetry-label text-telemetry-label">
                  {shown.map(({ x, i }) => (
                    <button
                      key={x.id}
                      onClick={() => setCurrent(i)}
                      aria-label={`Question ${i + 1}`}
                      aria-current={i === current ? "true" : undefined}
                      className={cellClass(x, i)}
                    >
                      {pad2(i + 1)}
                      {marked.includes(x.id) && i !== current && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-secondary-fixed" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      {/* ================= SUBMIT CONFIRM MODAL ================= */}
      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-surface-container-lowest/80 backdrop-blur-md"
        >
          <div className="bg-surface-container rounded-xl p-space-xl max-w-lg w-full shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center mb-space-md">
              <Icon name="notification_important" className="text-[28px]" />
            </div>
            <h3 className="font-headline-md text-headline-md font-bold mb-space-xs">Submit this exam?</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
              You are about to permanently submit <strong className="text-on-surface">{exam.title}</strong>. You cannot
              change your answers after submitting.
            </p>

            <div className="grid grid-cols-3 gap-space-sm bg-surface-container-low p-space-md rounded-lg mb-space-lg text-center font-telemetry-label text-telemetry-label">
              <div>
                <span className="block text-headline-md text-tertiary font-bold">{answeredCount}</span>
                <span className="text-on-surface-variant uppercase text-[10px]">Answered</span>
              </div>
              <div>
                <span className="block text-headline-md text-secondary font-bold">{markedCount}</span>
                <span className="text-on-surface-variant uppercase text-[10px]">Marked</span>
              </div>
              <div>
                <span className="block text-headline-md text-on-surface-variant font-bold">{pendingCount}</span>
                <span className="text-on-surface-variant uppercase text-[10px]">Unanswered</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-space-sm">
              <button
                onClick={() => setConfirming(false)}
                className="px-space-md py-2.5 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-on-surface font-body-md text-body-md font-semibold transition-colors"
              >
                Continue Exam
              </button>
              <button
                onClick={submit}
                disabled={submitting}
                className="px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary-container font-body-md text-body-md font-semibold hover:brightness-110 active:scale-95 transition-all shadow-md disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Confirm Submission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- small UI pieces ---------------- */

function Icon({ name, className = "" }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>;
}

function Screen({ children, wide }) {
  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md text-body-md flex items-center justify-center p-space-md">
      {wide ? (
        <div className="w-full max-w-xl">{children}</div>
      ) : (
        <div className="w-full max-w-md bg-surface-container rounded-xl p-space-lg shadow-2xl flex flex-col gap-space-md items-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}

// Animates a number from 0 to target (ease-out). Skipped if the user prefers reduced motion.
function useCountUp(target, duration = 1100) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(target * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

const TONES = {
  good: { stroke: "stroke-tertiary", text: "text-tertiary", chip: "bg-tertiary-container/30 text-tertiary" },
  mid: { stroke: "stroke-secondary", text: "text-secondary", chip: "bg-secondary-container/30 text-secondary" },
  low: { stroke: "stroke-error", text: "text-error", chip: "bg-error-container/40 text-error" },
};

function ResultView({ title, result, onBack }) {
  const score = Number(result.score) || 0;
  const max = Number(result.max) || 0;
  const correct = Number(result.correct) || 0;
  const wrong = Number(result.wrong) || 0;
  const skipped = Number(result.skipped) || 0;

  const total = correct + wrong + skipped;
  const attempted = correct + wrong;
  const pct = max > 0 ? Math.max(0, Math.min(100, (score / max) * 100)) : 0;
  const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;

  const toneKey = pct >= 75 ? "good" : pct >= 40 ? "mid" : "low";
  const tone = TONES[toneKey];
  const message =
    pct >= 90 ? "Outstanding performance!"
    : pct >= 75 ? "Great work, keep it up!"
    : pct >= 50 ? "Good effort, you are on the right track."
    : pct >= 25 ? "A decent start. Revise and try again."
    : "Keep practicing, you will improve.";

  // Ring geometry
  const R = 70;
  const C = 2 * Math.PI * R;
  const [go, setGo] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setGo(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const offset = go ? C * (1 - pct / 100) : C;

  const shown = Math.round(useCountUp(score) * 10) / 10;
  const shownPct = Math.round(useCountUp(pct));
  const seg = (n) => (total > 0 ? (n / total) * 100 : 0);

  return (
    <div className="flex flex-col gap-space-md">
      <div className="text-center flex flex-col items-center gap-space-sm">
        <span className="inline-flex items-center gap-space-xs px-3 py-1 rounded-full bg-primary-container/30 text-primary-fixed font-telemetry-label text-telemetry-label uppercase">
          <Icon name="verified" className="text-[14px]" /> Exam completed
        </span>
        <h2 className="font-headline-lg text-headline-lg">{title}</h2>
      </div>

      <div className="bg-surface-container-low rounded-xl p-space-xl shadow-2xl text-center">
        <div className="relative w-[190px] h-[190px] mx-auto">
          <svg viewBox="0 0 160 160" width="190" height="190" aria-hidden="true" className="block">
            <circle className="fill-none stroke-surface-container-highest" strokeWidth="12" cx="80" cy="80" r={R} />
            <circle
              className={`fill-none ${tone.stroke}`}
              strokeWidth="12"
              strokeLinecap="round"
              cx="80"
              cy="80"
              r={R}
              strokeDasharray={C}
              strokeDashoffset={offset}
              transform="rotate(-90 80 80)"
              style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.22,.8,.3,1)" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="font-headline-xl text-headline-xl tabular-nums leading-none">{shown}</div>
            <div className="mt-1 font-body-sm text-body-sm text-on-surface-variant">out of {max}</div>
          </div>
        </div>

        <div className={`inline-block mt-space-md px-4 py-1 rounded-full font-bold tabular-nums ${tone.chip}`}>
          {shownPct}%
        </div>
        <p className="mt-space-sm mb-space-lg font-body-lg text-body-lg font-semibold">{message}</p>

        <div className="grid grid-cols-3 gap-space-sm mb-space-md">
          <div className="flex flex-col items-center gap-0.5 py-space-md rounded-xl bg-tertiary-container/20">
            <Icon name="check_circle" className="text-tertiary text-[22px]" />
            <b className="font-headline-md text-headline-md">{correct}</b>
            <span className="font-telemetry-label text-[10px] text-on-surface-variant uppercase">Correct</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 py-space-md rounded-xl bg-error-container/25">
            <Icon name="cancel" className="text-error text-[22px]" />
            <b className="font-headline-md text-headline-md">{wrong}</b>
            <span className="font-telemetry-label text-[10px] text-on-surface-variant uppercase">Wrong</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 py-space-md rounded-xl bg-surface-container-high">
            <Icon name="do_not_disturb_on" className="text-outline text-[22px]" />
            <b className="font-headline-md text-headline-md">{skipped}</b>
            <span className="font-telemetry-label text-[10px] text-on-surface-variant uppercase">Skipped</span>
          </div>
        </div>

        <div className="flex h-2.5 rounded-full overflow-hidden bg-surface-container-highest" aria-label="Answer breakdown">
          <i className="block h-full bg-tertiary transition-all duration-1000" style={{ width: `${seg(correct)}%` }} />
          <i className="block h-full bg-error transition-all duration-1000" style={{ width: `${seg(wrong)}%` }} />
          <i className="block h-full bg-outline transition-all duration-1000" style={{ width: `${seg(skipped)}%` }} />
        </div>
        <p className="mt-space-sm mb-space-lg font-body-sm text-body-sm text-on-surface-variant">
          Accuracy {accuracy}% of attempted | {attempted} of {total} questions attempted
        </p>

        <button
          onClick={onBack}
          className="w-full px-space-md py-3 rounded-xl bg-primary-container text-on-primary-container font-semibold hover:brightness-110 active:scale-95 transition-all shadow-md"
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );
}