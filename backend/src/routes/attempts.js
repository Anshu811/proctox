import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { getAttempt, buildResult, finalizeAttempt } from "../services/mcqGrader.js";

const router = Router();
router.use(requireAuth);

router.param("id", (req, res, next, value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: "Invalid attempt id" });
  }
  req.attemptId = id;
  next();
});

// Only the owner can access an attempt. If time is up, auto-submit it.
const loadAttempt = asyncHandler(async (req, res, next) => {
  const attempt = await getAttempt(req.attemptId, req.user.id);
  if (!attempt) return res.status(404).json({ message: "Attempt not found" });

  if (attempt.status === "in_progress" && attempt.seconds_left <= 0) {
    await finalizeAttempt(attempt, "auto_submitted");
    attempt.status = "auto_submitted";
  }
  req.attempt = attempt;
  next();
});

// GET /api/attempts/:id -> questions (WITHOUT answers) + saved answers + remaining time
router.get(
  "/:id",
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
        type: a.description || "MCQ Exam",
        durationMinutes: a.duration_minutes,
        maxViolations: a.max_violations,
      },
    };

    if (a.status !== "in_progress") {
      const result = await buildResult(a.id, a.exam_id, Number(a.negative_marking));
      return res.json({ ...base, result });
    }

    const negative = Number(a.negative_marking);
    const qs = await pool.query(
      `SELECT id, topic, question_text AS text, options, marks
       FROM mcq_questions WHERE exam_id = $1 ORDER BY id`,
      [a.exam_id]
    );
    const questions = qs.rows.map((q) => ({ ...q, marks: Number(q.marks), negative }));

    const saved = await pool.query(
      "SELECT question_id, selected_index, marked_for_review FROM mcq_answers WHERE attempt_id = $1",
      [a.id]
    );
    const answers = {};
    const marked = [];
    for (const r of saved.rows) {
      if (r.selected_index !== null) answers[r.question_id] = r.selected_index;
      if (r.marked_for_review) marked.push(r.question_id);
    }

    res.json({ ...base, questions, answers, marked });
  })
);

// PUT /api/attempts/:id/answer body: { questionId, selectedIndex?, marked? }
router.put(
  "/:id/answer",
  loadAttempt,
  asyncHandler(async (req, res) => {
    const a = req.attempt;
    if (a.status !== "in_progress") {
      return res.status(409).json({ message: "Exam already finished" });
    }

    const { questionId, selectedIndex, marked } = req.body;
    const qid = Number(questionId);
    if (!Number.isInteger(qid)) return res.status(400).json({ message: "Invalid question" });

    const q = await pool.query(
      "SELECT options FROM mcq_questions WHERE id = $1 AND exam_id = $2",
      [qid, a.exam_id]
    );
    if (q.rowCount === 0) return res.status(404).json({ message: "Question not in this exam" });

    const hasSel = selectedIndex !== undefined;
    const hasMarked = marked !== undefined;

    if (hasSel && selectedIndex !== null) {
      const ok =
        Number.isInteger(selectedIndex) &&
        selectedIndex >= 0 &&
        selectedIndex < q.rows[0].options.length;
      if (!ok) return res.status(400).json({ message: "Invalid option" });
    }

    await pool.query(
      `INSERT INTO mcq_answers (attempt_id, question_id, selected_index, marked_for_review)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (attempt_id, question_id) DO UPDATE SET
         selected_index = CASE WHEN $5::boolean THEN EXCLUDED.selected_index
                               ELSE mcq_answers.selected_index END,
         marked_for_review = CASE WHEN $6::boolean THEN EXCLUDED.marked_for_review
                                  ELSE mcq_answers.marked_for_review END`,
      [a.id, qid, hasSel ? selectedIndex : null, hasMarked ? !!marked : false, hasSel, hasMarked]
    );

    res.json({ ok: true });
  })
);

// POST /api/attempts/:id/violation body: { type }
router.post(
  "/:id/violation",
  loadAttempt,
  asyncHandler(async (req, res) => {
    const a = req.attempt;
    if (a.status !== "in_progress") {
      return res.json({ violations: a.violation_count, finished: true });
    }

    const type = String(req.body?.type || "tab_switch").slice(0, 50);
    await pool.query("INSERT INTO violations (attempt_id, type) VALUES ($1, $2)", [a.id, type]);

    const upd = await pool.query(
      `UPDATE attempts SET violation_count = violation_count + 1
       WHERE id = $1 AND status = 'in_progress' RETURNING violation_count`,
      [a.id]
    );
    const count = upd.rows[0]?.violation_count ?? a.violation_count;

    if (count >= a.max_violations) {
      await finalizeAttempt(a, "auto_submitted");
      return res.json({ violations: count, finished: true });
    }
    res.json({ violations: count, finished: false });
  })
);

// POST /api/attempts/:id/submit
router.post(
  "/:id/submit",
  loadAttempt,
  asyncHandler(async (req, res) => {
    const a = req.attempt;
    let status = a.status;
    let result;

    if (status === "in_progress") {
      result = await finalizeAttempt(a, "submitted");
      status = "submitted";
    } else {
      result = await buildResult(a.id, a.exam_id, Number(a.negative_marking));
    }
    res.json({ status, result });
  })
);

export default router;