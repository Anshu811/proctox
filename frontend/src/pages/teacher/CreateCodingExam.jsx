import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// ====== SETTINGS ======
const API = "http://localhost:5000/api";
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

const DEFAULT_CPP = `#include <bits/stdc++.h>
using namespace std;

int main() {
  // write your solution here
  return 0;
}
`;
const DEFAULT_PYTHON = `# write your solution here
`;

const inputClass =
  "w-full bg-surface-container-lowest text-on-surface rounded-lg px-space-sm py-2.5 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary";
const codeClass = `${inputClass} font-code-md text-code-md whitespace-pre resize-y`;
const labelClass = "font-telemetry-label text-telemetry-label text-on-surface-variant uppercase";

export default function CreateCodingExam() {
  const navigate = useNavigate();
  const nextKey = useRef(1);

  const newTest = (hidden = false) => ({ key: nextKey.current++, input: "", expected: "", hidden });

  const newProblem = () => ({
    key: nextKey.current++,
    title: "",
    difficulty: "Medium",
    points: "10",
    timeLimitSec: "1",
    memoryLimitMb: "256",
    description: "",
    constraints: "",
    starterCpp: DEFAULT_CPP,
    starterPython: DEFAULT_PYTHON,
    tests: [newTest(false), newTest(true)],
  });

  const [details, setDetails] = useState({
    title: "",
    courseCode: "",
    description: "",
    durationMinutes: "60",
    maxViolations: "3",
    startTime: "",
    endTime: "",
  });
  const [problems, setProblems] = useState(() => [newProblem()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const setDetail = (k) => (e) => setDetails((d) => ({ ...d, [k]: e.target.value }));

  const updateProblem = (key, patch) =>
    setProblems((list) => list.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  const addProblem = () => setProblems((list) => [...list, newProblem()]);
  const removeProblem = (key) =>
    setProblems((list) => (list.length > 1 ? list.filter((p) => p.key !== key) : list));

  const addTest = (pKey, hidden) =>
    setProblems((list) => list.map((p) => (p.key === pKey ? { ...p, tests: [...p.tests, newTest(hidden)] } : p)));

  const updateTest = (pKey, tKey, patch) =>
    setProblems((list) =>
      list.map((p) =>
        p.key === pKey ? { ...p, tests: p.tests.map((t) => (t.key === tKey ? { ...t, ...patch } : t)) } : p
      )
    );

  const removeTest = (pKey, tKey) =>
    setProblems((list) =>
      list.map((p) =>
        p.key === pKey && p.tests.length > 1 ? { ...p, tests: p.tests.filter((t) => t.key !== tKey) } : p
      )
    );

  const totalPoints = problems.reduce((sum, p) => {
    const n = Number(p.points);
    return sum + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);

  // datetime-local gives a local time; convert it to a real timestamp before sending
  const toIso = (value) => (value ? new Date(value).toISOString() : null);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    // Quick checks so the teacher sees which problem needs attention
    for (let i = 0; i < problems.length; i++) {
      const p = problems[i];
      if (!p.tests.some((t) => !t.hidden)) {
        setError(`Problem ${i + 1}: add at least one sample (visible) test case`);
        return;
      }
      if (p.tests.some((t) => !t.expected.trim())) {
        setError(`Problem ${i + 1}: every test case needs an expected output`);
        return;
      }
    }

    setSaving(true);
    try {
      await api("/teacher/exams/coding", {
        method: "POST",
        body: {
          title: details.title,
          courseCode: details.courseCode,
          description: details.description,
          durationMinutes: Number(details.durationMinutes),
          maxViolations: Number(details.maxViolations || 3),
          startTime: toIso(details.startTime),
          endTime: toIso(details.endTime),
          problems: problems.map((p) => ({
            title: p.title,
            difficulty: p.difficulty,
            description: p.description,
            constraints: p.constraints,
            points: Number(p.points || 10),
            timeLimitSec: Number(p.timeLimitSec || 1),
            memoryLimitMb: Number(p.memoryLimitMb || 256),
            starterCpp: p.starterCpp,
            starterPython: p.starterPython,
            testCases: p.tests.map((t) => ({
              input: t.input,
              expectedOutput: t.expected,
              isHidden: t.hidden,
            })),
          })),
        },
      });
      navigate("/teacher");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md text-body-md antialiased selection:bg-primary selection:text-on-primary">
      {/* Top bar */}
      <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-gutter-lg bg-surface-container-lowest/90 backdrop-blur-xl border-b border-outline-variant/20">
        <div className="flex items-center gap-space-sm">
          <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
            <span className="material-symbols-outlined text-on-primary-container text-[20px]">shield_lock</span>
          </div>
          <span className="font-headline-md text-headline-md tracking-tight">ProctoX</span>
          <span className="hidden md:inline font-telemetry-label text-[10px] text-secondary bg-secondary-container/30 px-2 py-0.5 rounded ml-space-xs uppercase">
            Teacher Console
          </span>
        </div>
        <button
          onClick={() => navigate("/teacher")}
          className="flex items-center gap-space-xs px-space-sm py-space-xs rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to exams</span>
        </button>
      </header>

      <form onSubmit={submit} className="max-w-4xl mx-auto px-gutter-lg py-space-lg flex flex-col gap-space-lg">
        <div>
          <span className="font-telemetry-label text-telemetry-label text-tertiary uppercase tracking-wider">New assessment</span>
          <h1 className="font-headline-lg text-headline-lg">Create coding exam</h1>
          <p className="text-on-surface-variant">
            Students can write C++ or Python. Sample test cases are shown to them, hidden ones are used only for grading.
          </p>
        </div>

        {/* ---------- Exam details ---------- */}
        <section className="bg-surface-container-low rounded-xl p-space-lg shadow-lg flex flex-col gap-space-md">
          <h2 className="font-headline-md text-headline-md flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-primary text-[22px]">tune</span> Exam details
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className={labelClass}>Title *</span>
              <input
                required
                maxLength={200}
                value={details.title}
                onChange={setDetail("title")}
                className={inputClass}
                placeholder="CS403: Algorithms Lab"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className={labelClass}>Course code</span>
              <input maxLength={30} value={details.courseCode} onChange={setDetail("courseCode")} className={inputClass} placeholder="CS403" />
            </label>

            <label className="flex flex-col gap-1">
              <span className={labelClass}>Exam type label</span>
              <input maxLength={100} value={details.description} onChange={setDetail("description")} className={inputClass} placeholder="Lab Test" />
            </label>

            <label className="flex flex-col gap-1">
              <span className={labelClass}>Duration (minutes) *</span>
              <input
                required
                type="number"
                min="1"
                max="600"
                step="1"
                value={details.durationMinutes}
                onChange={setDetail("durationMinutes")}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className={labelClass}>Warnings before auto-submit</span>
              <input
                type="number"
                min="1"
                max="20"
                step="1"
                value={details.maxViolations}
                onChange={setDetail("maxViolations")}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className={labelClass}>Opens at (optional)</span>
              <input type="datetime-local" value={details.startTime} onChange={setDetail("startTime")} className={inputClass} />
            </label>

            <label className="flex flex-col gap-1">
              <span className={labelClass}>Closes at (optional)</span>
              <input type="datetime-local" value={details.endTime} onChange={setDetail("endTime")} className={inputClass} />
            </label>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Leave both times empty to keep the exam open all the time. The timer starts when each student begins the exam.
          </p>
        </section>

        {/* ---------- Problems ---------- */}
        <section className="flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[22px]">code</span> Problems
            </h2>
            <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">
              {problems.length} {problems.length === 1 ? "PROBLEM" : "PROBLEMS"} | {totalPoints} POINTS
            </span>
          </div>

          {problems.map((p, pi) => (
            <div key={p.key} className="bg-surface-container-low rounded-xl p-space-lg shadow-lg flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <span className="px-space-sm py-1 rounded bg-surface-container-highest text-tertiary font-telemetry-label text-telemetry-label uppercase font-bold">
                  Problem {pi + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeProblem(p.key)}
                  disabled={problems.length === 1}
                  className="flex items-center gap-1 px-space-sm py-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  <span>Remove</span>
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-space-md">
                <label className="flex flex-col gap-1 col-span-2 md:col-span-4">
                  <span className={labelClass}>Problem title *</span>
                  <input
                    required
                    maxLength={200}
                    value={p.title}
                    onChange={(e) => updateProblem(p.key, { title: e.target.value })}
                    className={inputClass}
                    placeholder="Two Sum"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Difficulty</span>
                  <select
                    value={p.difficulty}
                    onChange={(e) => updateProblem(p.key, { difficulty: e.target.value })}
                    className={inputClass}
                  >
                    <option>Easy</option>
                    <option>Medium</option>
                    <option>Hard</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Points</span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    value={p.points}
                    onChange={(e) => updateProblem(p.key, { points: e.target.value })}
                    className={inputClass}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Time limit (s)</span>
                  <input
                    type="number"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={p.timeLimitSec}
                    onChange={(e) => updateProblem(p.key, { timeLimitSec: e.target.value })}
                    className={inputClass}
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Memory (MB)</span>
                  <input
                    type="number"
                    min="16"
                    max="512"
                    step="16"
                    value={p.memoryLimitMb}
                    onChange={(e) => updateProblem(p.key, { memoryLimitMb: e.target.value })}
                    className={inputClass}
                  />
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className={labelClass}>Problem statement *</span>
                <textarea
                  required
                  rows={6}
                  value={p.description}
                  onChange={(e) => updateProblem(p.key, { description: e.target.value })}
                  className={`${inputClass} resize-y`}
                  placeholder="Describe the problem, the input format and the output format"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className={labelClass}>Constraints (optional)</span>
                <textarea
                  rows={2}
                  value={p.constraints}
                  onChange={(e) => updateProblem(p.key, { constraints: e.target.value })}
                  className={`${inputClass} resize-y`}
                  placeholder="1 <= n <= 100000"
                />
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Starter code: C++</span>
                  <textarea
                    rows={8}
                    spellCheck={false}
                    value={p.starterCpp}
                    onChange={(e) => updateProblem(p.key, { starterCpp: e.target.value })}
                    className={codeClass}
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Starter code: Python</span>
                  <textarea
                    rows={8}
                    spellCheck={false}
                    value={p.starterPython}
                    onChange={(e) => updateProblem(p.key, { starterPython: e.target.value })}
                    className={codeClass}
                  />
                </label>
              </div>

              {/* Test cases */}
              <div className="flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <span className={labelClass}>Test cases</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {p.tests.filter((t) => !t.hidden).length} sample | {p.tests.filter((t) => t.hidden).length} hidden
                  </span>
                </div>

                {p.tests.map((t, ti) => (
                  <div key={t.key} className="bg-surface-container rounded-lg p-space-md flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between gap-space-sm">
                      <span className="font-telemetry-label text-telemetry-label text-on-surface font-bold uppercase">
                        Test {ti + 1}
                      </span>
                      <div className="flex items-center gap-space-md">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={t.hidden}
                            onChange={(e) => updateTest(p.key, t.key, { hidden: e.target.checked })}
                            className="w-4 h-4 accent-primary"
                          />
                          <span className="font-body-sm text-body-sm">Hidden from students</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => removeTest(p.key, t.key)}
                          disabled={p.tests.length === 1}
                          aria-label={`Remove test ${ti + 1}`}
                          className="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                      <label className="flex flex-col gap-1">
                        <span className="font-telemetry-label text-[10px] text-on-surface-variant uppercase">Input</span>
                        <textarea
                          rows={3}
                          spellCheck={false}
                          value={t.input}
                          onChange={(e) => updateTest(p.key, t.key, { input: e.target.value })}
                          className={codeClass}
                          placeholder="(leave empty if the program reads nothing)"
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="font-telemetry-label text-[10px] text-on-surface-variant uppercase">Expected output *</span>
                        <textarea
                          rows={3}
                          spellCheck={false}
                          value={t.expected}
                          onChange={(e) => updateTest(p.key, t.key, { expected: e.target.value })}
                          className={codeClass}
                        />
                      </label>
                    </div>
                  </div>
                ))}

                <div className="flex flex-wrap items-center gap-space-md">
                  <button
                    type="button"
                    onClick={() => addTest(p.key, false)}
                    className="flex items-center gap-1 text-primary hover:underline font-semibold"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span> Add sample test
                  </button>
                  <button
                    type="button"
                    onClick={() => addTest(p.key, true)}
                    className="flex items-center gap-1 text-secondary hover:underline font-semibold"
                  >
                    <span className="material-symbols-outlined text-[18px]">lock</span> Add hidden test
                  </button>
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addProblem}
            className="flex items-center justify-center gap-space-xs py-space-sm rounded-xl border border-dashed border-outline-variant text-tertiary hover:bg-surface-container-low font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Add another problem
          </button>
        </section>

        {/* ---------- Publish ---------- */}
        {error && (
          <div role="alert" className="flex items-center gap-space-sm px-space-md py-space-sm rounded-xl bg-error-container/30 text-on-error-container">
            <span className="material-symbols-outlined text-error text-[20px]">warning</span>
            <span>{error}</span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-space-md pb-space-xl">
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Students see the exam on their dashboard as soon as you publish it.
          </span>
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              onClick={() => navigate("/teacher")}
              className="px-space-md py-2.5 rounded-lg bg-surface-container-highest hover:bg-surface-bright font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-space-xs px-space-lg py-2.5 rounded-lg bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-container font-semibold shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-60"
            >
              <span className="material-symbols-outlined text-[18px]">{saving ? "progress_activity" : "publish"}</span>
              <span>{saving ? "Publishing..." : "Publish exam"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}