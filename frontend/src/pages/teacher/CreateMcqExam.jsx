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

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const inputClass =
  "w-full bg-surface-container-lowest text-on-surface rounded-lg px-space-sm py-2.5 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-primary";
const labelClass = "font-telemetry-label text-telemetry-label text-on-surface-variant uppercase";

export default function CreateMcqExam() {
  const navigate = useNavigate();
  const nextKey = useRef(1);

  const newQuestion = () => ({
    key: nextKey.current++,
    topic: "",
    text: "",
    options: ["", "", "", ""],
    answerIndex: null,
    marks: "1",
  });

  const [details, setDetails] = useState({
    title: "",
    courseCode: "",
    description: "",
    durationMinutes: "30",
    negativeMarking: "0",
    maxViolations: "3",
    startTime: "",
    endTime: "",
  });
  const [questions, setQuestions] = useState(() => [newQuestion()]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const setDetail = (k) => (e) => setDetails((d) => ({ ...d, [k]: e.target.value }));

  const updateQuestion = (key, patch) =>
    setQuestions((list) => list.map((q) => (q.key === key ? { ...q, ...patch } : q)));

  const setOption = (key, index, value) =>
    setQuestions((list) =>
      list.map((q) =>
        q.key === key ? { ...q, options: q.options.map((o, i) => (i === index ? value : o)) } : q
      )
    );

  const addOption = (key) =>
    setQuestions((list) =>
      list.map((q) =>
        q.key === key && q.options.length < MAX_OPTIONS ? { ...q, options: [...q.options, ""] } : q
      )
    );

  const removeOption = (key, index) =>
    setQuestions((list) =>
      list.map((q) => {
        if (q.key !== key || q.options.length <= MIN_OPTIONS) return q;
        let answerIndex = q.answerIndex;
        if (answerIndex === index) answerIndex = null;
        else if (answerIndex !== null && answerIndex > index) answerIndex -= 1;
        return { ...q, options: q.options.filter((_, i) => i !== index), answerIndex };
      })
    );

  const addQuestion = () => setQuestions((list) => [...list, newQuestion()]);
  const removeQuestion = (key) =>
    setQuestions((list) => (list.length > 1 ? list.filter((q) => q.key !== key) : list));

  const totalMarks = questions.reduce((sum, q) => {
    const m = Number(q.marks);
    return sum + (Number.isFinite(m) && m > 0 ? m : 0);
  }, 0);

  // datetime-local gives a local time; convert it to a real timestamp before sending
  const toIso = (value) => (value ? new Date(value).toISOString() : null);

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    // Quick checks so the teacher sees which question needs attention
    for (let i = 0; i < questions.length; i++) {
      if (questions[i].answerIndex === null) {
        setError(`Question ${i + 1}: select the correct option`);
        return;
      }
    }

    setSaving(true);
    try {
      await api("/teacher/exams/mcq", {
        method: "POST",
        body: {
          title: details.title,
          courseCode: details.courseCode,
          description: details.description,
          durationMinutes: Number(details.durationMinutes),
          negativeMarking: Number(details.negativeMarking || 0),
          maxViolations: Number(details.maxViolations || 3),
          startTime: toIso(details.startTime),
          endTime: toIso(details.endTime),
          questions: questions.map((q) => ({
            topic: q.topic,
            text: q.text,
            options: q.options,
            answerIndex: q.answerIndex,
            marks: Number(q.marks || 1),
          })),
        },
      });
      navigate("/teacher");
    } catch (err) {
      setError(err.message);
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
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
          <span className="font-telemetry-label text-telemetry-label text-primary uppercase tracking-wider">New assessment</span>
          <h1 className="font-headline-lg text-headline-lg">Create MCQ exam</h1>
          <p className="text-on-surface-variant">Fill in the details, add your questions, then publish.</p>
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
                placeholder="CS403: Operating Systems"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className={labelClass}>Course code</span>
              <input
                maxLength={30}
                value={details.courseCode}
                onChange={setDetail("courseCode")}
                className={inputClass}
                placeholder="CS403"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className={labelClass}>Exam type label</span>
              <input
                maxLength={100}
                value={details.description}
                onChange={setDetail("description")}
                className={inputClass}
                placeholder="Midterm"
              />
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
              <span className={labelClass}>Negative marking (per wrong answer)</span>
              <input
                type="number"
                min="0"
                max="10"
                step="0.25"
                value={details.negativeMarking}
                onChange={setDetail("negativeMarking")}
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

            <div className="hidden md:block" />

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

        {/* ---------- Questions ---------- */}
        <section className="flex flex-col gap-space-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-primary text-[22px]">quiz</span> Questions
            </h2>
            <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">
              {questions.length} {questions.length === 1 ? "QUESTION" : "QUESTIONS"} | {totalMarks} MARKS
            </span>
          </div>

          {questions.map((q, qi) => (
            <div key={q.key} className="bg-surface-container-low rounded-xl p-space-lg shadow-lg flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <span className="px-space-sm py-1 rounded bg-surface-container-highest text-primary-fixed font-telemetry-label text-telemetry-label uppercase font-bold">
                  Question {qi + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.key)}
                  disabled={questions.length === 1}
                  className="flex items-center gap-1 px-space-sm py-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  <span>Remove</span>
                </button>
              </div>

              <label className="flex flex-col gap-1">
                <span className={labelClass}>Question text *</span>
                <textarea
                  required
                  rows={3}
                  value={q.text}
                  onChange={(e) => updateQuestion(q.key, { text: e.target.value })}
                  className={`${inputClass} resize-y`}
                  placeholder="Type the question here"
                />
              </label>

              <div className="flex flex-col gap-space-xs" role="radiogroup" aria-label={`Options for question ${qi + 1}`}>
                <span className={labelClass}>Options (select the correct one) *</span>
                {q.options.map((opt, oi) => {
                  const correct = q.answerIndex === oi;
                  return (
                    <div key={oi} className="flex items-center gap-space-sm">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={correct}
                        aria-label={`Mark option ${String.fromCharCode(65 + oi)} as correct`}
                        onClick={() => updateQuestion(q.key, { answerIndex: oi })}
                        className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center font-code-lg text-code-lg font-bold transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                          correct
                            ? "bg-tertiary-container text-on-tertiary"
                            : "bg-surface-container-highest text-on-surface hover:bg-surface-bright"
                        }`}
                      >
                        {correct ? <span className="material-symbols-outlined text-[18px]">check</span> : String.fromCharCode(65 + oi)}
                      </button>
                      <input
                        required
                        value={opt}
                        onChange={(e) => setOption(q.key, oi, e.target.value)}
                        className={inputClass}
                        placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        aria-label={`Option ${String.fromCharCode(65 + oi)} text`}
                      />
                      <button
                        type="button"
                        onClick={() => removeOption(q.key, oi)}
                        disabled={q.options.length <= MIN_OPTIONS}
                        aria-label={`Remove option ${String.fromCharCode(65 + oi)}`}
                        className="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    </div>
                  );
                })}
                <div className="flex flex-wrap items-center justify-between gap-space-sm pt-1">
                  <button
                    type="button"
                    onClick={() => addOption(q.key)}
                    disabled={q.options.length >= MAX_OPTIONS}
                    className="flex items-center gap-1 text-primary hover:underline font-semibold disabled:opacity-40 disabled:no-underline disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span> Add option
                  </button>
                  {q.answerIndex === null && (
                    <span className="font-body-sm text-body-sm text-secondary">Select the correct option</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Topic (optional)</span>
                  <input
                    maxLength={120}
                    value={q.topic}
                    onChange={(e) => updateQuestion(q.key, { topic: e.target.value })}
                    className={inputClass}
                    placeholder="Transport Layer • TCP"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className={labelClass}>Marks</span>
                  <input
                    type="number"
                    min="0.25"
                    max="100"
                    step="0.25"
                    value={q.marks}
                    onChange={(e) => updateQuestion(q.key, { marks: e.target.value })}
                    className={inputClass}
                  />
                </label>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addQuestion}
            className="flex items-center justify-center gap-space-xs py-space-sm rounded-xl border border-dashed border-outline-variant text-tertiary hover:bg-surface-container-low font-semibold transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Add another question
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