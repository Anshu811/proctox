import { pool } from "./pool.js";
import { exam, questions } from "./mcqSeedData.js";

async function seed() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id FROM exams WHERE title = $1 AND type = 'mcq'",
      [exam.title]
    );
    if (existing.rowCount > 0) {
      console.log("Already seeded, nothing to do");
      await client.query("ROLLBACK");
      return;
    }

    const courseCode = exam.title.split(":")[0].trim();
    const negative = questions[0]?.negative ?? 0;

    const ins = await client.query(
      `INSERT INTO exams (title, course_code, description, type, duration_minutes, negative_marking, max_violations)
       VALUES ($1, $2, $3, 'mcq', $4, $5, $6) RETURNING id`,
      [exam.title, courseCode, exam.type, exam.durationMinutes, negative, exam.maxViolations]
    );
    const examId = ins.rows[0].id;

    for (const q of questions) {
      await client.query(
        `INSERT INTO mcq_questions (exam_id, topic, question_text, options, correct_index, marks)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [examId, q.topic, q.text, JSON.stringify(q.options), q.answer, q.marks]
      );
    }

    await client.query("COMMIT");
    console.log(`Seeded exam #${examId} with ${questions.length} questions`);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();