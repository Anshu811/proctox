import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getAttempt, finalizeAttempt } from "../services/mcqGrader.js";
import { isSupportedLanguage } from "../services/judge0.js";
import { judgeProblem, pointsFor, codingScore } from "../services/codingGrader.js";

const router = Router();
router.use(requireAuth);

const MAX_CODE_LENGTH = 50000;
const COOLDOWN_MS = 3000; // protects the shared Judge0 server from spam
const lastRun = new Map(); // userId -> timestamp of the last run/submit

router.param("id", (req, res, next, value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid attempt id" });
  }
  req.attemptId = id;
  next();
});

// Only the owner can access an attempt, and it must belong to a coding exam.
// If time is up, the attempt is auto-submitted.
const loadAttempt = asyncHandler(async (req, res, next) => {
  const attempt = await getAttempt(req.attemptId, req.user.id);
  if (!attempt) return res.status(404).json({ message: "Attempt not found" });
  if (attempt.type !== "coding") {
    return res.status(400).json({ message: "This is not a coding exam" });
  }

  if (attempt.status === "in_progress" && attempt.seconds_left <= 0) {
    await finalizeAttempt(attempt, "auto_submitted");
    attempt.status = "auto_submitted";
  }
  req.attempt = attempt;
  next();
});

// Shared validation for the run and submit endpoints
async function prepareJudging(req, res) {
  const a = req.attempt;
  if (a.status !== "in_progress") {
    res.status(409).json({ message: "Exam already finished" });
    return null;
  }

  const { problemId, language, code } = req.body || {};
  if (!isSupportedLanguage(language)) {
    res.status(400).json({ message: "Unsupported language" });
    return null;
  }
  if (typeof code !== "string" || !code.trim() || code.length > MAX_CODE_LENGTH) {
    res.status(400).json({ message: "Code is empty or too long" });
    return null;
  }

  const p = await pool.query("SELECT * FROM coding_problems WHERE id = $1 AND exam_id = $2", [
    Number(problemId),
    a.exam_id,
  ]);
  if (p.rowCount === 0) {
    res.status(404).json({ message: "Problem not found in this exam" });
    return null;
  }

  const now = Date.now();
  if (now - (lastRun.get(req.user.id) || 0) < COOLDOWN_MS) {
    res.status(429).json({ message: "Please wait a few seconds before running again" });
    return null;
  }
  lastRun.set(req.user.id, now);

  return { problem: p.rows[0], language, code };
}

// POST /api/coding/exams/:examId/start  (student only)
router.post(
  "/exams/:examId/start",
  requireRole("student"),
  asyncHandler(async (req, res) => {
    const examId = Number(req.params.examId);
    if (!Number.isInteger(examId) || examId <= 0) {
      return res.status(400).json({ message: "Invalid exam id" });
    }

    const exam = await pool.query(
      "SELECT id, type, start_time, end_time FROM exams WHERE id = $1",
      [examId]
    );
    if (exam.rowCount === 0) return res.status(404).json({ message: "Exam not found" });
    if (exam.rows[0].type !== "coding") {
      return res.status(400).json({ message: "This is not a coding exam" });
    }

    // If an attempt already exists, return it (the timer does not reset on refresh)
    const existing = await pool.query(
      "SELECT id FROM attempts WHERE exam_id = $1 AND user_id = $2",
      [examId, req.user.id]
    );
    if (existing.rowCount > 0) return res.json({ attemptId: existing.rows[0].id });

    const { start_time, end_time } = exam.rows[0];
    const now = Date.now();
    if (start_time && now < new Date(start_time).getTime()) {
      return res.status(403).json({ message: "This exam has not started yet" });
    }
    if (end_time && now > new Date(end_time).getTime()) {
      return res.status(403).json({ message: "This exam has already ended" });
    }

    const created = await pool.query(
      `INSERT INTO attempts (exam_id, user_id) VALUES ($1, $2)
       ON CONFLICT (exam_id, user_id) DO UPDATE SET exam_id = EXCLUDED.exam_id
       RETURNING id`,
      [examId, req.user.id]
    );
    res.status(201).json({ attemptId: created.rows[0].id });
  })
);

// GET /api/coding/attempts/:id -> problems (visible samples only) + last saved code + time left
router.get(
  "/attempts/:id",
  loadAttempt,
  asyncHandler(async (req, res) => {
    const a = req.attempt;
    const base = {
      attempt: {
        id: a.id,
        status: a.status,
        secondsLeft: a.seconds_left,
        violations: a.violation_count,
      },
      exam: {
        title: a.title,
        durationMinutes: a.duration_minutes,
        maxViolations: a.max_violations,
      },
    };

    const probs = await pool.query(
      `SELECT id, title, difficulty, description, constraints, points,
              starter_cpp, starter_python, time_limit_sec, memory_limit_mb
       FROM coding_problems WHERE exam_id = $1 ORDER BY id`,
      [a.exam_id]
    );
    const maxScore = probs.rows.reduce((sum, p) => sum + Number(p.points), 0);

    if (a.status !== "in_progress") {
      return res.json({ ...base, finished: true, score: await codingScore(a.id), maxScore });
    }

    const ids = probs.rows.map((p) => p.id);

    const samples = await pool.query(
      `SELECT problem_id, input, expected_output
       FROM test_cases WHERE is_hidden = FALSE AND problem_id = ANY($1::int[]) ORDER BY id`,
      [ids]
    );

    const subs = await pool.query(
      `SELECT DISTINCT ON (problem_id) problem_id, language, code, status,
              passed_cases, total_cases, score
       FROM code_submissions WHERE attempt_id = $1
       ORDER BY problem_id, created_at DESC`,
      [a.id]
    );
    const best = await pool.query(
      `SELECT problem_id, MAX(score) AS best FROM code_submissions
       WHERE attempt_id = $1 GROUP BY problem_id`,
      [a.id]
    );

    const problems = probs.rows.map((p) => {
      const last = subs.rows.find((s) => s.problem_id === p.id) || null;
      const bestRow = best.rows.find((b) => b.problem_id === p.id);
      return {
        ...p,
        points: Number(p.points),
        time_limit_sec: Number(p.time_limit_sec),
        samples: samples.rows
          .filter((s) => s.problem_id === p.id)
          .map((s) => ({ input: s.input, expected: s.expected_output })),
        lastSubmission: last && { ...last, score: Number(last.score) },
        bestScore: bestRow ? Number(bestRow.best) : 0,
      };
    });

    res.json({ ...base, finished: false, problems, maxScore });
  })
);

// POST /api/coding/attempts/:id/run  body: { problemId, language, code }
// Runs against the visible sample cases only. Nothing is saved.
router.post(
  "/attempts/:id/run",
  loadAttempt,
  asyncHandler(async (req, res) => {
    const ctx = await prepareJudging(req, res);
    if (!ctx) return;

    try {
      const r = await judgeProblem(ctx.problem, {
        language: ctx.language,
        code: ctx.code,
        onlyVisible: true,
      });
      res.json(r);
    } catch (err) {
      console.error(err);
      res.status(502).json({ message: "Code runner is unavailable. Please try again." });
    }
  })
);

// POST /api/coding/attempts/:id/submit-code  body: { problemId, language, code }
// Runs against ALL test cases, saves the submission and its score.
router.post(
  "/attempts/:id/submit-code",
  loadAttempt,
  asyncHandler(async (req, res) => {
    const ctx = await prepareJudging(req, res);
    if (!ctx) return;

    let r;
    try {
      r = await judgeProblem(ctx.problem, {
        language: ctx.language,
        code: ctx.code,
        onlyVisible: false,
      });
    } catch (err) {
      console.error(err);
      return res.status(502).json({ message: "Code runner is unavailable. Please try again." });
    }

    const score = pointsFor(ctx.problem, r.passed, r.total);
    await pool.query(
      `INSERT INTO code_submissions
         (attempt_id, problem_id, language, code, status, passed_cases, total_cases, score)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.attempt.id, ctx.problem.id, ctx.language, ctx.code, r.verdict, r.passed, r.total, score]
    );

    res.json({
      verdict: r.verdict,
      passedCases: r.passed,
      totalCases: r.total,
      score,
      cases: r.cases,
    });
  })
);

// POST /api/coding/attempts/:id/finish
router.post(
  "/attempts/:id/finish",
  loadAttempt,
  asyncHandler(async (req, res) => {
    const a = req.attempt;
    let status = a.status;
    let score;

    if (status === "in_progress") {
      const result = await finalizeAttempt(a, "submitted");
      score = result.score;
      status = "submitted";
    } else {
      score = await codingScore(a.id);
    }
    res.json({ status, score });
  })
);

export default router;