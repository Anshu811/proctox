import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(requireAuth, requireRole("student"));

// Max possible score of an exam (sum of MCQ marks or coding points)
const MAX_SCORE_SQL = `
  CASE WHEN e.type = 'mcq'
    THEN (SELECT COALESCE(SUM(marks), 0) FROM mcq_questions WHERE exam_id = e.id)
    ELSE (SELECT COALESCE(SUM(points), 0) FROM coding_problems WHERE exam_id = e.id)
  END`;

const toNum = (v) => (v === null || v === undefined ? null : Number(v));

// GET /api/student/overview
// Every exam together with this student's own attempt (if any)
router.get(
  "/overview",
  asyncHandler(async (req, res) => {
    const r = await pool.query(
      `SELECT e.id, e.title, e.course_code, e.description, e.type, e.duration_minutes,
              e.negative_marking, e.max_violations, e.start_time, e.end_time,
              (SELECT COUNT(*) FROM mcq_questions q WHERE q.exam_id = e.id)::int AS question_count,
              (SELECT COUNT(*) FROM coding_problems p WHERE p.exam_id = e.id)::int AS problem_count,
              ${MAX_SCORE_SQL} AS max_score,
              a.id AS attempt_id, a.status AS attempt_status, a.score,
              a.violation_count, a.started_at, a.submitted_at,
              CASE WHEN a.status = 'in_progress' THEN
                GREATEST(0, CEIL(EXTRACT(EPOCH FROM (
                  a.started_at + e.duration_minutes * INTERVAL '1 minute' - NOW()
                ))))::int
              END AS seconds_left
       FROM exams e
       LEFT JOIN attempts a ON a.exam_id = e.id AND a.user_id = $1
       ORDER BY e.id`,
      [req.user.id]
    );

    const exams = r.rows.map((e) => ({
      ...e,
      negative_marking: Number(e.negative_marking),
      max_score: Number(e.max_score),
      score: toNum(e.score),
    }));

    res.json({ now: new Date().toISOString(), exams });
  })
);

export default router;