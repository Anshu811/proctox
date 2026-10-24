import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(requireAuth, requireRole("teacher"));

// Max possible score of an exam (sum of MCQ marks or coding points)
const MAX_SCORE_SQL = `
  CASE WHEN e.type = 'mcq'
    THEN (SELECT COALESCE(SUM(marks), 0) FROM mcq_questions WHERE exam_id = e.id)
    ELSE (SELECT COALESCE(SUM(points), 0) FROM coding_problems WHERE exam_id = e.id)
  END`;

const toNum = (v) => (v === null || v === undefined ? null : Number(v));

// GET /api/teacher/exams -> every exam with participation stats
router.get(
  "/exams",
  asyncHandler(async (req, res) => {
    const r = await pool.query(
      `SELECT e.id, e.title, e.course_code, e.type, e.duration_minutes, e.max_violations,
              ${MAX_SCORE_SQL} AS max_score,
              COUNT(a.id)::int AS attempts,
              COUNT(a.id) FILTER (WHERE a.status <> 'in_progress')::int AS finished,
              ROUND(AVG(a.score) FILTER (WHERE a.status <> 'in_progress'), 2) AS avg_score
       FROM exams e
       LEFT JOIN attempts a ON a.exam_id = e.id
       GROUP BY e.id
       ORDER BY e.id`
    );
    const exams = r.rows.map((e) => ({
      ...e,
      max_score: Number(e.max_score),
      avg_score: toNum(e.avg_score),
    }));
    res.json({ exams });
  })
);

// GET /api/teacher/exams/:id/results -> one row per student attempt
router.get(
  "/exams/:id/results",
  asyncHandler(async (req, res) => {
    const examId = Number(req.params.id);
    if (!Number.isInteger(examId) || examId <= 0) {
      return res.status(400).json({ message: "Invalid exam id" });
    }

    const exam = await pool.query(
      `SELECT e.id, e.title, e.type, ${MAX_SCORE_SQL} AS max_score
       FROM exams e WHERE e.id = $1`,
      [examId]
    );
    if (exam.rowCount === 0) return res.status(404).json({ message: "Exam not found" });

    const r = await pool.query(
      `SELECT a.id AS attempt_id, u.name, u.email, a.status, a.score,
              a.violation_count, a.started_at, a.submitted_at
       FROM attempts a
       JOIN users u ON u.id = a.user_id
       WHERE a.exam_id = $1
       ORDER BY a.score DESC NULLS LAST, a.started_at`,
      [examId]
    );

    res.json({
      exam: { ...exam.rows[0], max_score: Number(exam.rows[0].max_score) },
      results: r.rows.map((x) => ({ ...x, score: toNum(x.score) })),
    });
  })
);

// GET /api/teacher/attempts/:id -> full detail of one attempt
router.get(
  "/attempts/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid attempt id" });
    }

    const a = await pool.query(
      `SELECT a.id, a.exam_id, a.status, a.score, a.violation_count, a.started_at, a.submitted_at,
              u.name, u.email, e.title, e.type
       FROM attempts a
       JOIN users u ON u.id = a.user_id
       JOIN exams e ON e.id = a.exam_id
       WHERE a.id = $1`,
      [id]
    );
    if (a.rowCount === 0) return res.status(404).json({ message: "Attempt not found" });
    const attempt = { ...a.rows[0], score: toNum(a.rows[0].score) };

    const violations = await pool.query(
      "SELECT type, created_at FROM violations WHERE attempt_id = $1 ORDER BY id",
      [id]
    );

    let detail;
    if (attempt.type === "mcq") {
      const q = await pool.query(
        `SELECT q.id, q.question_text, q.options, q.correct_index, q.marks, a.selected_index
         FROM mcq_questions q
         LEFT JOIN mcq_answers a ON a.question_id = q.id AND a.attempt_id = $1
         WHERE q.exam_id = $2
         ORDER BY q.id`,
        [id, attempt.exam_id]
      );
      detail = { answers: q.rows.map((x) => ({ ...x, marks: Number(x.marks) })) };
    } else {
      const s = await pool.query(
        `SELECT s.id, p.title AS problem_title, s.language, s.code, s.status,
                s.passed_cases, s.total_cases, s.score, s.created_at
         FROM code_submissions s
         JOIN coding_problems p ON p.id = s.problem_id
         WHERE s.attempt_id = $1
         ORDER BY s.created_at`,
        [id]
      );
      detail = { submissions: s.rows.map((x) => ({ ...x, score: Number(x.score) })) };
    }

    res.json({ attempt, violations: violations.rows, ...detail });
  })
);

// ---------- Create and delete exams ----------

// Optional date: returns null when empty, undefined when invalid, otherwise a Date
const parseDate = (v) => {
  if (v === undefined || v === null || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

// Fields shared by MCQ and coding exams. Returns { error } or { value }
function validateDetails(b) {
  const title = String(b.title || "").trim();
  if (!title || title.length > 200) return { error: "Title is required (max 200 characters)" };

  const courseCode = String(b.courseCode || "").trim().slice(0, 30);
  const description = String(b.description || "").trim().slice(0, 100);

  const durationMinutes = Number(b.durationMinutes);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 600) {
    return { error: "Duration must be a whole number between 1 and 600 minutes" };
  }

  const maxViolations = Number(b.maxViolations ?? 3);
  if (!Number.isInteger(maxViolations) || maxViolations < 1 || maxViolations > 20) {
    return { error: "Allowed warnings must be a whole number between 1 and 20" };
  }

  const startTime = parseDate(b.startTime);
  const endTime = parseDate(b.endTime);
  if (startTime === undefined || endTime === undefined) return { error: "Start or end time is not a valid date" };
  if (startTime && endTime && endTime <= startTime) return { error: "End time must be after the start time" };

  return { value: { title, courseCode, description, durationMinutes, maxViolations, startTime, endTime } };
}

// Body of "create MCQ exam". Returns { error } or { value }
function validateMcqExam(b) {
  const d = validateDetails(b);
  if (d.error) return d;

  const negativeMarking = Number(b.negativeMarking ?? 0);
  if (!Number.isFinite(negativeMarking) || negativeMarking < 0 || negativeMarking > 10) {
    return { error: "Negative marking must be between 0 and 10" };
  }

  if (!Array.isArray(b.questions) || b.questions.length < 1 || b.questions.length > 200) {
    return { error: "Add between 1 and 200 questions" };
  }

  const questions = [];
  for (let i = 0; i < b.questions.length; i++) {
    const q = b.questions[i] || {};
    const n = i + 1;

    const text = String(q.text || "").trim();
    if (!text) return { error: `Question ${n}: the question text is empty` };

    if (!Array.isArray(q.options) || q.options.length < 2 || q.options.length > 6) {
      return { error: `Question ${n}: give between 2 and 6 options` };
    }
    const options = q.options.map((o) => String(o ?? "").trim());
    if (options.some((o) => !o)) return { error: `Question ${n}: an option is empty` };

    // Number(null) is 0, so an empty answer must be rejected before converting
    const noAnswer = q.answerIndex === null || q.answerIndex === undefined || q.answerIndex === "";
    const answerIndex = Number(q.answerIndex);
    if (noAnswer || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= options.length) {
      return { error: `Question ${n}: choose the correct option` };
    }

    const marks = Number(q.marks ?? 1);
    if (!Number.isFinite(marks) || marks <= 0 || marks > 100) {
      return { error: `Question ${n}: marks must be between 0 and 100` };
    }

    questions.push({ topic: String(q.topic || "").trim().slice(0, 120) || null, text, options, answerIndex, marks });
  }

  return { value: { ...d.value, negativeMarking, questions } };
}

// Body of "create coding exam". Returns { error } or { value }
function validateCodingExam(b) {
  const d = validateDetails(b);
  if (d.error) return d;

  if (!Array.isArray(b.problems) || b.problems.length < 1 || b.problems.length > 20) {
    return { error: "Add between 1 and 20 problems" };
  }

  const problems = [];
  for (let i = 0; i < b.problems.length; i++) {
    const p = b.problems[i] || {};
    const n = i + 1;

    const title = String(p.title || "").trim();
    if (!title || title.length > 200) return { error: `Problem ${n}: title is required (max 200 characters)` };

    const difficulty = String(p.difficulty || "").trim();
    if (difficulty && !["Easy", "Medium", "Hard"].includes(difficulty)) {
      return { error: `Problem ${n}: difficulty must be Easy, Medium or Hard` };
    }

    const description = String(p.description || "").trim();
    if (!description || description.length > 10000) {
      return { error: `Problem ${n}: the statement is required (max 10000 characters)` };
    }

    const points = Number(p.points ?? 10);
    if (!Number.isInteger(points) || points < 1 || points > 1000) {
      return { error: `Problem ${n}: points must be a whole number between 1 and 1000` };
    }

    const timeLimitSec = Number(p.timeLimitSec ?? 1);
    if (!Number.isFinite(timeLimitSec) || timeLimitSec < 0.5 || timeLimitSec > 10) {
      return { error: `Problem ${n}: time limit must be between 0.5 and 10 seconds` };
    }

    const memoryLimitMb = Number(p.memoryLimitMb ?? 256);
    if (!Number.isInteger(memoryLimitMb) || memoryLimitMb < 16 || memoryLimitMb > 512) {
      return { error: `Problem ${n}: memory limit must be between 16 and 512 MB` };
    }

    if (!Array.isArray(p.testCases) || p.testCases.length < 1 || p.testCases.length > 50) {
      return { error: `Problem ${n}: add between 1 and 50 test cases` };
    }
    const testCases = [];
    for (let j = 0; j < p.testCases.length; j++) {
      const t = p.testCases[j] || {};
      const input = String(t.input ?? "");
      const expectedOutput = String(t.expectedOutput ?? "").trimEnd();
      if (input.length > 10000 || expectedOutput.length > 10000) {
        return { error: `Problem ${n}, test case ${j + 1}: input and output can be at most 10000 characters` };
      }
      if (!expectedOutput.trim()) {
        return { error: `Problem ${n}, test case ${j + 1}: the expected output is empty` };
      }
      testCases.push({ input, expectedOutput, isHidden: Boolean(t.isHidden) });
    }
    if (!testCases.some((t) => !t.isHidden)) {
      return { error: `Problem ${n}: add at least one sample (visible) test case` };
    }

    problems.push({
      title,
      difficulty: difficulty || null,
      description,
      constraints: String(p.constraints || "").trim().slice(0, 2000) || null,
      points,
      starterCpp: String(p.starterCpp || "").slice(0, 20000) || null,
      starterPython: String(p.starterPython || "").slice(0, 20000) || null,
      timeLimitSec,
      memoryLimitMb,
      testCases,
    });
  }

  return { value: { ...d.value, problems } };
}

// POST /api/teacher/exams/mcq -> creates the exam and all its questions together
router.post(
  "/exams/mcq",
  asyncHandler(async (req, res) => {
    const { error, value: v } = validateMcqExam(req.body || {});
    if (error) return res.status(400).json({ message: error });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const exam = await client.query(
        `INSERT INTO exams
           (title, course_code, description, type, duration_minutes, negative_marking,
            max_violations, start_time, end_time, created_by)
         VALUES ($1, $2, $3, 'mcq', $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          v.title,
          v.courseCode || null,
          v.description || null,
          v.durationMinutes,
          v.negativeMarking,
          v.maxViolations,
          v.startTime,
          v.endTime,
          req.user.id,
        ]
      );
      const examId = exam.rows[0].id;

      for (const q of v.questions) {
        await client.query(
          `INSERT INTO mcq_questions (exam_id, topic, question_text, options, correct_index, marks)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [examId, q.topic, q.text, JSON.stringify(q.options), q.answerIndex, q.marks]
        );
      }

      await client.query("COMMIT");
      res.status(201).json({ examId, questionCount: v.questions.length });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

// POST /api/teacher/exams/coding -> creates the exam, its problems and every test case together
router.post(
  "/exams/coding",
  asyncHandler(async (req, res) => {
    const { error, value: v } = validateCodingExam(req.body || {});
    if (error) return res.status(400).json({ message: error });

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const exam = await client.query(
        `INSERT INTO exams
           (title, course_code, description, type, duration_minutes, negative_marking,
            max_violations, start_time, end_time, created_by)
         VALUES ($1, $2, $3, 'coding', $4, 0, $5, $6, $7, $8)
         RETURNING id`,
        [
          v.title,
          v.courseCode || null,
          v.description || null,
          v.durationMinutes,
          v.maxViolations,
          v.startTime,
          v.endTime,
          req.user.id,
        ]
      );
      const examId = exam.rows[0].id;

      for (const p of v.problems) {
        const prob = await client.query(
          `INSERT INTO coding_problems
             (exam_id, title, difficulty, description, constraints, points,
              starter_cpp, starter_python, time_limit_sec, memory_limit_mb)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [
            examId,
            p.title,
            p.difficulty,
            p.description,
            p.constraints,
            p.points,
            p.starterCpp,
            p.starterPython,
            p.timeLimitSec,
            p.memoryLimitMb,
          ]
        );
        const problemId = prob.rows[0].id;

        for (const t of p.testCases) {
          await client.query(
            `INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
             VALUES ($1, $2, $3, $4)`,
            [problemId, t.input, t.expectedOutput, t.isHidden]
          );
        }
      }

      await client.query("COMMIT");
      res.status(201).json({ examId, problemCount: v.problems.length });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  })
);

// DELETE /api/teacher/exams/:id -> only allowed while nobody has attempted the exam
router.delete(
  "/exams/:id",
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ message: "Invalid exam id" });

    const used = await pool.query("SELECT 1 FROM attempts WHERE exam_id = $1 LIMIT 1", [id]);
    if (used.rowCount > 0) {
      return res.status(409).json({ message: "Students have already attempted this exam, so it cannot be deleted" });
    }

    const del = await pool.query("DELETE FROM exams WHERE id = $1", [id]);
    if (del.rowCount === 0) return res.status(404).json({ message: "Exam not found" });
    res.json({ ok: true });
  })
);

export default router;