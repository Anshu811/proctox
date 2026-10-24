import { pool } from "../db/pool.js";
import { codingScore } from "./codingGrader.js";

// Attempt + exam info + remaining time (calculated on the server)
export async function getAttempt(attemptId, userId) {
  const r = await pool.query(
    `SELECT a.id, a.exam_id, a.status, a.violation_count,
            e.title, e.type, e.description, e.duration_minutes, e.negative_marking, e.max_violations,
            GREATEST(0, CEIL(EXTRACT(EPOCH FROM (
              a.started_at + e.duration_minutes * INTERVAL '1 minute' - NOW()
            ))))::int AS seconds_left
     FROM attempts a
     JOIN exams e ON e.id = a.exam_id
     WHERE a.id = $1 AND a.user_id = $2`,
    [attemptId, userId]
  );
  return r.rows[0] || null;
}

// Calculate the score from saved answers (correct answers never leave the server)
export async function buildResult(attemptId, examId, negative) {
  const r = await pool.query(
    `SELECT q.correct_index, q.marks, a.selected_index
     FROM mcq_questions q
     LEFT JOIN mcq_answers a ON a.question_id = q.id AND a.attempt_id = $1
     WHERE q.exam_id = $2`,
    [attemptId, examId]
  );

  let score = 0, max = 0, correct = 0, wrong = 0, skipped = 0;
  for (const q of r.rows) {
    const marks = Number(q.marks);
    max += marks;
    if (q.selected_index === null) skipped++;
    else if (q.selected_index === q.correct_index) { score += marks; correct++; }
    else { score -= negative; wrong++; }
  }
  return { score, max, correct, wrong, skipped };
}

// Close the attempt and store the final score (works for MCQ and coding exams)
export async function finalizeAttempt(attempt, status) {
  let result;
  if (attempt.type === "coding") {
    result = { score: await codingScore(attempt.id) };
  } else {
    result = await buildResult(attempt.id, attempt.exam_id, Number(attempt.negative_marking));
  }

  await pool.query(
    `UPDATE attempts SET status = $1, submitted_at = NOW(), score = $2
     WHERE id = $3 AND status = 'in_progress'`,
    [status, result.score, attempt.id]
  );
  return result;
}