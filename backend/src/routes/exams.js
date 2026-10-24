import { Router } from "express";
import { pool } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();
router.use(requireAuth);

// GET /api/exams?type=mcq
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const type = req.query.type || null;
    const r = await pool.query(
      `SELECT e.id, e.title, e.course_code, e.description, e.type, e.duration_minutes,
              e.negative_marking, e.max_violations, e.start_time, e.end_time,
              (SELECT COUNT(*) FROM mcq_questions q WHERE q.exam_id = e.id)::int AS question_count,
              a.id AS attempt_id, a.status AS attempt_status
       FROM exams e
       LEFT JOIN attempts a ON a.exam_id = e.id AND a.user_id = $1
       WHERE ($2::text IS NULL OR e.type = $2::text)
       ORDER BY e.id`,
      [req.user.id, type]
    );
    const exams = r.rows.map((e) => ({ ...e, negative_marking: Number(e.negative_marking) }));
    res.json({ exams });
  })
);

// POST /api/exams/:id/start  (student only)
router.post(
  "/:id/start",
  requireRole("student"),
  asyncHandler(async (req, res) => {
    const examId = Number(req.params.id);
    if (!Number.isInteger(examId) || examId <= 0) {
      return res.status(400).json({ message: "Invalid exam id" });
    }

    const exam = await pool.query(
      "SELECT id, type, start_time, end_time FROM exams WHERE id = $1",
      [examId]
    );
    if (exam.rowCount === 0) return res.status(404).json({ message: "Exam not found" });
    if (exam.rows[0].type !== "mcq") {
      return res.status(400).json({ message: "This is not an MCQ exam" });
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

export default router;