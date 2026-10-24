import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

// ====== SETTINGS ======
const API = "http://localhost:5000/api";
const getToken = () => localStorage.getItem("token"); // key where your login saves the JWT
// ======================

const LANGS = [
  { id: "cpp", label: "C++" },
  { id: "python", label: "Python" },
];

const VERDICTS = {
  accepted: "Accepted",
  passed: "Passed",
  wrong_answer: "Wrong answer",
  compile_error: "Compilation error",
  runtime_error: "Runtime error",
  time_limit: "Time limit exceeded",
  error: "Judge error",
  no_tests: "No test cases",
};

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

// Works with /exam/coding (picks the first coding exam) and with /exam/2 (numeric id).
async function resolveExamId(raw) {
  const n = Number(raw);
  if (raw && Number.isInteger(n) && n > 0) return n;
  const { exams } = await api("/exams?type=coding");
  if (!exams.length) throw new Error("No coding exam is available yet");
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

// ====== SYNTAX HIGHLIGHT (VS Code Dark+ colors) ======
const SPLIT = (s) => new Set(s.split(" ").filter(Boolean));

const WORDS = {
  cpp: {
    control: SPLIT("if else for while do switch case default break continue return goto try catch throw"),
    keyword: SPLIT("new delete class struct enum union namespace using template typename typedef public private protected virtual override final static const constexpr inline operator this sizeof auto register volatile extern explicit friend mutable noexcept nullptr true false"),
    type: SPLIT("int long short char bool float double void unsigned signed size_t string vector map set unordered_map unordered_set pair queue stack deque priority_queue array bitset list multiset multimap tuple cin cout cerr endl ll ull int64_t uint64_t int32_t uint32_t istream ostream"),
    builtin: SPLIT(""),
  },
  python: {
    control: SPLIT("if elif else for while break continue return try except finally raise import from with yield pass assert async await"),
    keyword: SPLIT("False None True and as class def del global in is lambda nonlocal not or self cls"),
    type: SPLIT("int str float list dict set tuple bool"),
    builtin: SPLIT("print input len range sum min max abs sorted enumerate zip map filter open reversed any all ord chr isinstance type"),
  },
};

const TOKEN_COLORS = {
  comment: "#6a9955",
  string: "#ce9178",
  number: "#b5cea8",
  preproc: "#c586c0",
  control: "#c586c0",
  keyword: "#569cd6",
  type: "#4ec9b0",
  function: "#dcdcaa",
  builtin: "#dcdcaa",
  decorator: "#dcdcaa",
};

const RULES = {
  cpp: [
    ["comment", /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/y],
    ["string", /"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?/y],
    ["preproc", /#[ \t]*[A-Za-z_]+/y],
    ["number", /(?:0[xX][\da-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?)[uUlLfF]*/y],
    ["ident", /[A-Za-z_]\w*/y],
  ],
  python: [
    ["comment", /#.*/y],
    ["string", /[rRbBfFuU]{0,2}(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$))/y],
    ["string", /[rRbBfFuU]{0,2}(?:"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)/y],
    ["decorator", /@[A-Za-z_]\w*/y],
    ["number", /(?:0[xX][\da-fA-F]+|\d+\.?\d*(?:[eE][+-]?\d+)?)j?/y],
    ["ident", /[A-Za-z_]\w*/y],
  ],
};

const HEADER = /<[^>\n]*>/y;

function classify(word, rest, lang, prevIdent) {
  const w = WORDS[lang];
  if (w.control.has(word)) return "control";
  if (w.keyword.has(word)) return "keyword";
  if (lang === "python" && prevIdent === "def") return "function";
  if (lang === "python" && prevIdent === "class") return "type";
  if (w.type.has(word)) return "type";
  if (w.builtin.has(word)) return "builtin";
  if (/^\s*\(/.test(rest)) return "function";
  return null;
}

function tokenize(code, lang) {
  const rules = RULES[lang] || [];
  const out = [];
  let i = 0;
  let plain = "";
  let prevIdent = "";
  let pendingInclude = false;
  const flush = () => {
    if (plain) {
      out.push([null, plain]);
      plain = "";
    }
  };

  while (i < code.length) {
    let hit = null;
    if (pendingInclude && code[i] === "<") {
      HEADER.lastIndex = i;
      const m = HEADER.exec(code);
      if (m) hit = ["string", m[0]];
    }
    if (!hit) {
      for (const [type, re] of rules) {
        re.lastIndex = i;
        const m = re.exec(code);
        if (m && m[0]) {
          hit = [type, m[0]];
          break;
        }
      }
    }
    if (!hit) {
      const ch = code[i];
      plain += ch;
      i++;
      if (!/\s/.test(ch)) {
        prevIdent = "";
        pendingInclude = false;
      }
      continue;
    }
    let [type, text] = hit;
    flush();
    i += text.length;
    if (type === "ident") {
      type = classify(text, code.slice(i), lang, prevIdent);
      prevIdent = text;
      pendingInclude = false;
    } else {
      prevIdent = "";
      pendingInclude = type === "preproc" && /include/.test(text);
    }
    out.push([type, text]);
  }
  flush();
  return out;
}
// ====== END SYNTAX HIGHLIGHT ======

const diffStyle = (d = "") => {
  const k = d.toLowerCase();
  if (k === "easy") return "bg-tertiary-container/30 text-tertiary";
  if (k === "hard") return "bg-error-container/40 text-error";
  return "bg-secondary-container/30 text-secondary";
};

export default function CodingExam() {
  const params = useParams();
  const rawExam = params.examId ?? params.id;
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [attemptId, setAttemptId] = useState(null);
  const [exam, setExam] = useState(null);
  const [problems, setProblems] = useState([]);
  const [maxScore, setMaxScore] = useState(0);
  const [current, setCurrent] = useState(0);
  const [langs, setLangs] = useState({}); // problemId -> language id
  const [codes, setCodes] = useState({}); // "problemId:lang" -> source code
  const [results, setResults] = useState({}); // problemId -> { mode, data }
  const [busy, setBusy] = useState(null); // null | "run" | "submit"
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [violations, setViolations] = useState(0);
  const [finished, setFinished] = useState(null); // { score }
  const [confirming, setConfirming] = useState(false);
  const [finishing, setFinishing] = useState(false);

  // UI-only state
  const [fontSize, setFontSize] = useState(13);
  const [tab, setTab] = useState("samples"); // samples | hidden | output

  const deadlineRef = useRef(0);
  const doneRef = useRef(false);
  const gutRef = useRef(null);
  const preRef = useRef(null);

  const loadAttempt = useCallback(async (id) => {
    const data = await api(`/coding/attempts/${id}`);
    setExam(data.exam);
    setViolations(data.attempt.violations);
    setMaxScore(data.maxScore);

    if (data.finished) {
      doneRef.current = true;
      setFinished({ score: data.score });
      return;
    }

    setProblems(data.problems);
    const startLangs = {};
    for (const p of data.problems) {
      startLangs[p.id] = p.lastSubmission?.language || "cpp";
    }
    setLangs(startLangs);
    setSecondsLeft(data.attempt.secondsLeft);
    deadlineRef.current = Date.now() + data.attempt.secondsLeft * 1000;
  }, []);

  // Start (or resume) the attempt
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const examId = await resolveExamId(rawExam);
        const { attemptId: id } = await api(`/coding/exams/${examId}/start`, { method: "POST" });
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

  const finish = useCallback(async () => {
    if (!attemptId || doneRef.current) return;
    doneRef.current = true;
    setFinishing(true);
    try {
      const data = await api(`/coding/attempts/${attemptId}/finish`, { method: "POST" });
      setFinished({ score: data.score });
    } catch (e) {
      doneRef.current = false;
      setNotice(e.message);
    } finally {
      setFinishing(false);
      setConfirming(false);
    }
  }, [attemptId]);

  // Countdown (starts from the server's remaining time)
  useEffect(() => {
    if (!problems.length || finished) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(t);
        finish();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [problems.length, finished, finish]);

  // Switching tabs counts as a violation
  useEffect(() => {
    if (!attemptId || !problems.length || finished) return;
    const onHide = async () => {
      if (document.visibilityState !== "hidden" || doneRef.current) return;
      try {
        const r = await api(`/attempts/${attemptId}/violation`, {
          method: "POST",
          body: { type: "tab_switch" },
        });
        setViolations(r.violations);
        if (r.finished) {
          doneRef.current = true;
          await loadAttempt(attemptId);
        } else {
          setNotice(`Tab switch detected. Warning ${r.violations}.`);
        }
      } catch (e) {
        setNotice(e.message);
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [attemptId, problems.length, finished, loadAttempt]);

  // ---- Editor helpers ----
  const problem = problems[current];
  const lang = problem ? langs[problem.id] || "cpp" : "cpp";
  const res = problem ? results[problem.id] : undefined;

  // When a new result arrives, jump to the most useful console tab
  useEffect(() => {
    if (!res) return;
    const cs = res.data.cases || [];
    const sampleFail = cs.some((c) => !c.hidden && c.status !== "passed");
    const hasHidden = cs.some((c) => c.hidden);
    setTab(!sampleFail && hasHidden ? "hidden" : "samples");
  }, [res]);

  const starterFor = (p, l) => {
    if (p.lastSubmission && p.lastSubmission.language === l) return p.lastSubmission.code;
    return (l === "cpp" ? p.starter_cpp : p.starter_python) || "";
  };
  const codeFor = (p, l) => {
    const key = `${p.id}:${l}`;
    return key in codes ? codes[key] : starterFor(p, l);
  };
  const setCode = (p, l, value) => setCodes((c) => ({ ...c, [`${p.id}:${l}`]: value }));
  const resetCode = () => {
    const original = (lang === "cpp" ? problem.starter_cpp : problem.starter_python) || "";
    setCode(problem, lang, original);
  };

  const onEditorKeyDown = (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    const ta = e.target;
    const s = ta.selectionStart;
    const en = ta.selectionEnd;
    setCode(problem, lang, ta.value.slice(0, s) + "  " + ta.value.slice(en));
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = s + 2;
    });
  };

  // ---- Run / Submit ----
  const judge = async (mode) => {
    if (busy) return;
    setBusy(mode);
    setNotice("");
    const pid = problem.id;
    try {
      const data = await api(
        `/coding/attempts/${attemptId}/${mode === "run" ? "run" : "submit-code"}`,
        {
          method: "POST",
          body: { problemId: pid, language: lang, code: codeFor(problem, lang) },
        }
      );
      setResults((r) => ({ ...r, [pid]: { mode, data } }));
      if (mode === "submit") {
        setProblems((list) =>
          list.map((p) => (p.id === pid ? { ...p, bestScore: Math.max(p.bestScore, data.score) } : p))
        );
      }
    } catch (e) {
      setNotice(e.message);
    } finally {
      setBusy(null);
    }
  };

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

  if (finished)
    return (
      <Screen>
        <div className="w-12 h-12 rounded-xl bg-tertiary-container/40 flex items-center justify-center">
          <Icon name="verified" className="text-tertiary text-[28px]" />
        </div>
        <h2 className="font-headline-md text-headline-md">{exam?.title}: finished</h2>
        <p className="font-headline-xl text-headline-xl text-primary">
          {finished.score}
          <span className="text-body-lg font-normal text-on-surface-variant"> / {maxScore}</span>
        </p>
        <button
          onClick={() => navigate(-1)}
          className="px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary-container font-semibold hover:brightness-110"
        >
          Back to dashboard
        </button>
      </Screen>
    );

  const total = problems.reduce((sum, p) => sum + p.bestScore, 0);
  const low = secondsLeft <= 300;
  const warnDanger = violations > 0;

  const cases = res?.data.cases || [];
  const sampleCases = cases.filter((c) => !c.hidden);
  const hiddenCases = cases.filter((c) => c.hidden);
  const compilerOut = [...new Set(cases.map((c) => c.error).filter(Boolean))].join("\n\n");
  const resOk = res ? res.data.verdict === "accepted" || res.data.verdict === "passed" : false;
  const activeList = tab === "samples" ? sampleCases : tab === "hidden" ? hiddenCases : [];

  const consoleTabs = [
    {
      id: "samples",
      icon: "done_all",
      label: `Sample Cases${sampleCases.length ? ` (${sampleCases.filter((c) => c.status === "passed").length}/${sampleCases.length})` : ""}`,
    },
    {
      id: "hidden",
      icon: "lock",
      label: `Hidden Tests${hiddenCases.length ? ` (${hiddenCases.filter((c) => c.status === "passed").length}/${hiddenCases.length})` : ""}`,
    },
    { id: "output", icon: "code_blocks", label: "Compiler Output" },
  ];

  const statusText = busy
    ? busy === "run" ? "RUNNING..." : "JUDGING..."
    : !res ? "NO RUN YET" : resOk ? "ALL TESTS GREEN" : "CHECK RESULTS";
  const statusColor = busy ? "text-primary" : res ? (resOk ? "text-tertiary" : "text-error") : "text-on-surface-variant";
  const dotColor = busy ? "bg-primary animate-pulse" : res ? (resOk ? "bg-tertiary" : "bg-error") : "bg-outline";

  const code = codeFor(problem, lang);
  const lineCount = code.split("\n").length;
  const lh = Math.round(fontSize * 1.6);

  return (
    <div className="min-h-screen lg:h-screen flex flex-col bg-background text-on-surface font-body-md text-body-md antialiased selection:bg-primary selection:text-on-primary lg:overflow-hidden">
      {/* ================= BRAND BAR ================= */}
      <header className="h-14 shrink-0 flex items-center justify-between px-gutter-lg bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant/20">
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

      {/* ================= EXAM CONTEXT BAR ================= */}
      <div className="shrink-0 bg-surface-container-lowest px-gutter-lg py-space-sm flex flex-wrap items-center justify-between gap-space-md shadow-md relative z-20">
        <div className="flex flex-col min-w-0">
          <span className="font-telemetry-label text-telemetry-label text-primary uppercase tracking-wider">
            Coding Assessment
          </span>
          <h1 className="font-headline-md text-headline-md font-semibold tracking-tight truncate">{exam.title}</h1>
        </div>

        <div className="flex items-center gap-space-sm bg-surface-container px-space-md py-space-xs rounded-xl shadow-inner">
          <Icon name="timer" className={`${low ? "text-error" : "text-primary"} text-[20px]`} />
          <div className="flex flex-col items-center">
            <span className="font-telemetry-label text-[10px] text-on-surface-variant uppercase tracking-widest leading-none">
              Server Time Remaining
            </span>
            <span className={`font-timer-display text-timer-display tracking-wider ${low ? "text-error" : "text-on-surface"}`}>
              {fmt(secondsLeft)}
            </span>
          </div>
          <div className={`w-2 h-2 rounded-full animate-ping ${low ? "bg-error" : "bg-tertiary"}`} />
        </div>

        <div className="flex flex-wrap items-center gap-space-sm">
          <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface-container-low">
            <Icon name="emoji_events" className="text-primary text-[18px]" />
            <div className="flex flex-col text-left">
              <span className="font-telemetry-label text-[10px] text-on-surface font-bold leading-tight">
                {total}/{maxScore} PTS
              </span>
              <span className="font-telemetry-label text-[9px] text-on-surface-variant uppercase">Total Score</span>
            </div>
          </div>

          <div className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg bg-surface-container-low">
            <Icon name={warnDanger ? "warning" : "verified_user"} className={`${warnDanger ? "text-error" : "text-tertiary"} text-[18px]`} />
            <div className="flex flex-col text-left">
              <span className={`font-telemetry-label text-[10px] font-bold leading-tight ${warnDanger ? "text-error" : "text-tertiary"}`}>
                {violations}/{exam.maxViolations} WARNINGS
              </span>
              <span className="font-telemetry-label text-[9px] text-on-surface-variant uppercase">Proctor Active</span>
            </div>
          </div>

          <button
            onClick={() => judge("run")}
            disabled={!!busy}
            className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-tertiary font-semibold transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Icon name={busy === "run" ? "progress_activity" : "play_arrow"} className={`text-[18px] ${busy === "run" ? "animate-spin" : ""}`} />
            <span>{busy === "run" ? "Running..." : "Run Samples"}</span>
          </button>

          <button
            onClick={() => judge("submit")}
            disabled={!!busy}
            className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg bg-primary-container hover:brightness-110 text-on-primary-container font-semibold transition-all shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Icon name={busy === "submit" ? "progress_activity" : "cloud_upload"} className={`text-[18px] ${busy === "submit" ? "animate-spin" : ""}`} />
            <span>{busy === "submit" ? "Judging..." : "Submit Solution"}</span>
          </button>

          <button
            onClick={() => setConfirming(true)}
            className="flex items-center gap-space-xs px-space-md py-space-xs rounded-lg border border-error/40 text-error hover:bg-error-container/30 font-semibold transition-all"
          >
            <Icon name="flag" className="text-[18px]" />
            <span>Finish Exam</span>
          </button>
        </div>
      </div>

      {/* ================= NOTICE ================= */}
      {notice && (
        <div
          role="alert"
          className="shrink-0 mx-gutter-lg mt-space-sm px-space-md py-space-sm rounded-xl bg-error-container/30 text-on-error-container flex items-center justify-between gap-space-md"
        >
          <div className="flex items-center gap-space-sm">
            <Icon name="warning" className="text-error text-[20px]" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice("")} aria-label="Dismiss" className="p-1 rounded-lg hover:bg-error-container/50">
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
      )}

      {/* ================= PROBLEM TABS ================= */}
      <div className="shrink-0 bg-surface-container px-gutter-lg py-space-xs mt-space-sm flex items-center gap-space-sm overflow-x-auto" role="tablist">
        {problems.map((p, i) => {
          const active = i === current;
          const solved = p.points > 0 && p.bestScore >= p.points;
          const partial = !solved && p.bestScore > 0;
          return (
            <button
              key={p.id}
              role="tab"
              aria-selected={active}
              onClick={() => setCurrent(i)}
              className={`px-space-sm py-space-xs rounded-lg font-body-sm text-body-sm flex items-center gap-space-xs whitespace-nowrap transition-all ${
                active
                  ? "bg-surface-container-highest text-on-surface font-medium shadow-sm"
                  : solved
                  ? "text-tertiary hover:bg-surface-container-high"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              {active ? (
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              ) : (
                <Icon
                  name={solved ? "check_circle" : partial ? "timelapse" : "pending"}
                  className={`text-[16px] ${solved ? "text-tertiary" : "text-outline"}`}
                />
              )}
              <span>P{i + 1}: {p.title}</span>
              <span
                className={`font-telemetry-label text-[10px] px-1.5 py-0.5 rounded ${
                  active
                    ? "bg-primary-container text-on-primary-container"
                    : solved
                    ? "bg-tertiary-container/30 text-tertiary"
                    : "bg-surface-container text-outline"
                }`}
              >
                {p.bestScore}/{p.points}
              </span>
            </button>
          );
        })}
      </div>

      {/* ================= MAIN SPLIT ================= */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
        {/* ---------- LEFT: problem ---------- */}
        <section className="lg:col-span-5 bg-surface-container-lowest lg:overflow-y-auto">
          <div className="p-space-lg flex flex-col gap-space-md">
            <div className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between">
                <span className="font-telemetry-label text-telemetry-label text-tertiary uppercase">
                  Problem {current + 1} of {problems.length}
                </span>
                <span className="font-telemetry-label text-telemetry-label text-on-surface-variant bg-surface-container px-2 py-0.5 rounded">
                  Score: {problem.points} PTS
                </span>
              </div>
              <h2 className="font-headline-lg text-headline-lg font-semibold tracking-tight">{problem.title}</h2>
              <div className="flex items-center gap-space-xs flex-wrap mt-space-xs">
                {problem.difficulty && (
                  <span className={`font-telemetry-label text-[11px] px-2 py-0.5 rounded-md ${diffStyle(problem.difficulty)}`}>
                    {problem.difficulty}
                  </span>
                )}
                <span className="font-telemetry-label text-[11px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-md">
                  {problem.time_limit_sec}s limit
                </span>
                <span className="font-telemetry-label text-[11px] bg-surface-container text-on-surface-variant px-2 py-0.5 rounded-md">
                  {problem.memory_limit_mb} MB
                </span>
              </div>
            </div>

            <div className="text-on-surface-variant leading-relaxed whitespace-pre-wrap">{problem.description}</div>

            {problem.constraints && (
              <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-xs shadow-sm">
                <div className="flex items-center gap-space-xs font-semibold">
                  <Icon name="rule" className="text-secondary text-[18px]" />
                  <span>Runtime Constraints &amp; Limits</span>
                </div>
                <pre className="font-telemetry-label text-telemetry-label text-on-surface-variant whitespace-pre-wrap leading-relaxed">
                  {problem.constraints}
                </pre>
              </div>
            )}

            {problem.samples.map((s, i) => (
              <div key={i} className="flex flex-col gap-space-xs">
                <span className="font-semibold flex items-center gap-space-xs">
                  <Icon name="terminal" className="text-primary text-[18px]" /> Sample {i + 1}
                </span>
                <div className="bg-surface-container-low rounded-xl p-space-md flex flex-col gap-space-sm font-code-md text-code-md shadow-inner">
                  <div>
                    <span className="font-telemetry-label text-telemetry-label text-on-surface-variant uppercase">Input</span>
                    <pre className="bg-surface-container-lowest p-space-sm rounded-lg text-on-surface mt-1 overflow-x-auto leading-relaxed">{s.input}</pre>
                  </div>
                  <div>
                    <span className="font-telemetry-label text-telemetry-label text-on-surface-variant uppercase">Expected Output</span>
                    <pre className="bg-surface-container-lowest p-space-sm rounded-lg text-tertiary mt-1 font-semibold overflow-x-auto leading-relaxed">{s.expected}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- RIGHT: editor + console ---------- */}
        <main className="lg:col-span-7 bg-surface-container-low flex flex-col min-h-0">
          {/* Editor header strip */}
          <div className="shrink-0 bg-surface-container px-space-md py-space-xs flex items-center justify-between gap-space-sm shadow-sm z-10">
            <div className="relative inline-block">
              <select
                value={lang}
                onChange={(e) => setLangs((l) => ({ ...l, [problem.id]: e.target.value }))}
                aria-label="Language"
                className="appearance-none bg-surface-container-highest text-on-surface font-code-md text-code-md pl-space-sm pr-space-lg py-1 rounded-lg focus:outline-none cursor-pointer"
              >
                {LANGS.map((l) => (
                  <option key={l.id} value={l.id}>{l.label}</option>
                ))}
              </select>
              <Icon name="expand_more" className="text-[16px] text-on-surface-variant absolute right-2 top-2 pointer-events-none" />
            </div>

            <div className="flex items-center gap-space-xs">
              <div className="flex items-center bg-surface-container-lowest rounded-lg p-0.5">
                <button
                  onClick={() => setFontSize((f) => Math.max(11, f - 1))}
                  className="px-2 py-0.5 text-on-surface-variant hover:text-on-surface font-telemetry-label text-[11px] rounded"
                  title="Decrease font"
                >
                  A-
                </button>
                <span className="font-telemetry-label text-[10px] text-outline px-1">|</span>
                <button
                  onClick={() => setFontSize((f) => Math.min(18, f + 1))}
                  className="px-2 py-0.5 text-on-surface-variant hover:text-on-surface font-telemetry-label text-[11px] rounded"
                  title="Increase font"
                >
                  A+
                </button>
              </div>
              <button
                onClick={resetCode}
                className="flex items-center gap-1 px-space-xs py-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors font-body-sm text-body-sm"
                title="Revert to starter code"
              >
                <Icon name="restart_alt" className="text-[16px]" />
                <span className="hidden md:inline">Reset</span>
              </button>
            </div>
          </div>

          {/* Editor: line numbers + highlighted layer + textarea */}
          <div className="flex flex-1 min-h-[320px] lg:min-h-0 bg-surface-container-lowest font-code-md">
            <div
              ref={gutRef}
              aria-hidden="true"
              className="w-12 shrink-0 overflow-hidden py-space-sm pb-10 pr-space-sm text-right text-outline/60 select-none"
              style={{ fontSize, lineHeight: `${lh}px` }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>

            <div className="relative flex-1 min-w-0">
              <pre
                ref={preRef}
                aria-hidden="true"
                className="absolute inset-0 m-0 overflow-hidden pointer-events-none whitespace-pre py-space-sm px-space-sm pb-10 text-on-surface font-code-md"
                style={{ fontSize, lineHeight: `${lh}px`, tabSize: 2, fontVariantLigatures: "none" }}
              >
                <Highlight code={code} lang={lang} />
              </pre>
              <textarea
                spellCheck={false}
                autoCapitalize="off"
                autoCorrect="off"
                aria-label="Code editor"
                wrap="off"
                value={code}
                onChange={(e) => setCode(problem, lang, e.target.value)}
                onKeyDown={onEditorKeyDown}
                onScroll={(e) => {
                  const t = e.target;
                  if (gutRef.current) gutRef.current.scrollTop = t.scrollTop;
                  if (preRef.current) {
                    preRef.current.scrollTop = t.scrollTop;
                    preRef.current.scrollLeft = t.scrollLeft;
                  }
                }}
                className="absolute inset-0 w-full h-full resize-none bg-transparent py-space-sm px-space-sm pb-10 outline-none whitespace-pre overflow-auto text-transparent caret-primary selection:bg-primary/30 font-code-md"
                style={{ fontSize, lineHeight: `${lh}px`, tabSize: 2, fontVariantLigatures: "none" }}
              />
            </div>
          </div>

          {/* Console */}
          <div className="shrink-0 bg-surface-container flex flex-col shadow-lg z-10">
            <div className="flex items-center justify-between px-space-md bg-surface-container-high">
              <div className="flex items-center gap-space-xs overflow-x-auto">
                {consoleTabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`px-space-sm py-2 font-telemetry-label text-telemetry-label rounded-t-lg flex items-center gap-1.5 whitespace-nowrap transition-all ${
                      tab === t.id ? "text-tertiary bg-surface-container" : "text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    <Icon name={t.icon} className={`text-[15px] ${t.id === "hidden" && tab !== t.id ? "text-secondary" : ""}`} />
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-space-xs shrink-0 pl-space-sm">
                <span className={`font-telemetry-label text-[10px] font-bold tracking-wider ${statusColor}`}>{statusText}</span>
                <span className={`w-2 h-2 rounded-full ${dotColor}`} />
              </div>
            </div>

            <div className="p-space-md h-56 overflow-y-auto flex flex-col gap-space-sm bg-surface-container" aria-live="polite">
              {!res && !busy && (
                <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant gap-space-xs">
                  <Icon name="terminal" className="text-[28px] text-outline" />
                  <span>Run your code to see results here.</span>
                </div>
              )}

              {busy && (
                <div className="flex-1 flex flex-col items-center justify-center text-primary gap-space-xs">
                  <Icon name="progress_activity" className="text-[28px] animate-spin" />
                  <span>{busy === "run" ? "Compiling and running samples..." : "Judging your solution..."}</span>
                </div>
              )}

              {res && !busy && tab !== "output" && (
                <>
                  <div className="p-space-sm bg-surface-container-lowest rounded-xl flex items-center justify-between gap-space-sm">
                    <div className="flex items-center gap-space-sm min-w-0">
                      <div
                        className={`w-7 h-7 shrink-0 rounded-lg flex items-center justify-center ${
                          resOk ? "bg-tertiary-container text-on-tertiary" : "bg-error-container text-on-error-container"
                        }`}
                      >
                        <Icon name={resOk ? "verified" : "error"} className="text-[18px]" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold leading-tight truncate">
                          {VERDICTS[res.data.verdict] || res.data.verdict}
                        </span>
                        <span className="font-telemetry-label text-[11px] text-on-surface-variant truncate">
                          {res.mode === "submit"
                            ? `${res.data.passedCases}/${res.data.totalCases} tests passed`
                            : `${res.data.passed}/${res.data.total} samples passed`}
                        </span>
                      </div>
                    </div>
                    {res.mode === "submit" && (
                      <span
                        className={`shrink-0 font-telemetry-label text-telemetry-label px-space-sm py-1 rounded-full uppercase ${
                          resOk ? "text-tertiary bg-tertiary-container/30" : "text-on-surface-variant bg-surface-container"
                        }`}
                      >
                        +{res.data.score} points
                      </span>
                    )}
                  </div>

                  {activeList.length === 0 ? (
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {tab === "hidden" ? "Hidden tests run only when you submit." : "No sample results yet."}
                    </span>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-xs">
                      {activeList.map((c, i) => (
                        <CaseCard key={i} c={c} n={i + 1} />
                      ))}
                    </div>
                  )}
                </>
              )}

              {res && !busy && tab === "output" && (
                <pre className="bg-surface-container-lowest rounded-lg p-space-sm font-code-md text-[12px] text-on-surface-variant whitespace-pre-wrap overflow-x-auto">
                  {compilerOut || "No compiler output."}
                </pre>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ================= FINISH CONFIRM MODAL ================= */}
      {confirming && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-space-md">
          <div className="w-full max-w-md bg-surface-container-high rounded-xl p-space-lg shadow-2xl flex flex-col gap-space-md">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-lg bg-error-container/50 flex items-center justify-center">
                <Icon name="flag" className="text-error" />
              </div>
              <h3 className="font-headline-md text-headline-md">Finish exam?</h3>
            </div>
            <p className="text-on-surface-variant">
              Finish now? Only your best submission for each problem counts. You cannot continue afterwards.
            </p>
            <div className="flex justify-end gap-space-sm">
              <button
                onClick={() => setConfirming(false)}
                className="px-space-md py-space-xs rounded-lg bg-surface-container-highest hover:brightness-110 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={finish}
                disabled={finishing}
                className="px-space-md py-space-xs rounded-lg bg-error text-on-error font-semibold hover:brightness-110 disabled:opacity-60"
              >
                {finishing ? "Finishing..." : "Yes, finish"}
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

function Highlight({ code, lang }) {
  const tokens = useMemo(() => tokenize(code, lang), [code, lang]);
  return (
    <>
      {tokens.map(([type, text], i) =>
        type ? (
          <span key={i} style={{ color: TOKEN_COLORS[type] }}>{text}</span>
        ) : (
          text
        )
      )}
      {"\n"}
    </>
  );
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

function CaseCard({ c, n }) {
  const ok = c.status === "passed";
  const label = c.hidden ? `Hidden Case #${n}` : `Sample Case ${n}`;
  const head = (
    <div className="flex items-center justify-between gap-space-sm w-full">
      <div className="flex items-center gap-space-xs min-w-0">
        <Icon
          name={ok ? (c.hidden ? "verified" : "check_circle") : "cancel"}
          className={`text-[18px] ${ok ? "text-tertiary" : "text-error"}`}
        />
        <div className="flex flex-col min-w-0">
          <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate">{label}</span>
          <span className="font-telemetry-label text-[10px] text-on-surface-variant">
            {c.hidden ? "Blind evaluation" : "Visible test"}
          </span>
        </div>
      </div>
      <span className={`font-telemetry-label text-telemetry-label uppercase shrink-0 ${ok ? "text-tertiary" : "text-error"}`}>
        {VERDICTS[c.status] || c.status}
      </span>
    </div>
  );

  if (c.hidden) {
    return <div className="bg-surface-container-low p-space-sm rounded-lg">{head}</div>;
  }

  return (
    <details className="bg-surface-container-low p-space-sm rounded-lg" open={!ok}>
      <summary className="cursor-pointer list-none">{head}</summary>
      <div className="mt-space-sm flex flex-col gap-space-xs">
        <p className="font-telemetry-label text-[10px] text-on-surface-variant uppercase">Input</p>
        <pre className="bg-surface-container-lowest rounded-lg p-space-sm font-code-md text-[12px] text-on-surface whitespace-pre-wrap overflow-x-auto">{c.input}</pre>
        <p className="font-telemetry-label text-[10px] text-on-surface-variant uppercase">Expected</p>
        <pre className="bg-surface-container-lowest rounded-lg p-space-sm font-code-md text-[12px] text-tertiary whitespace-pre-wrap overflow-x-auto">{c.expected}</pre>
        <p className="font-telemetry-label text-[10px] text-on-surface-variant uppercase">Your output</p>
        <pre className={`bg-surface-container-lowest rounded-lg p-space-sm font-code-md text-[12px] whitespace-pre-wrap overflow-x-auto ${ok ? "text-on-surface" : "text-error"}`}>{c.actual || "(empty)"}</pre>
        {c.error && (
          <>
            <p className="font-telemetry-label text-[10px] text-on-surface-variant uppercase">Error</p>
            <pre className="bg-surface-container-lowest rounded-lg p-space-sm font-code-md text-[12px] text-error whitespace-pre-wrap overflow-x-auto">{c.error}</pre>
          </>
        )}
      </div>
    </details>
  );
}