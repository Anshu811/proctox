import { pool } from "../db/pool.js";
import { runOnJudge0 } from "./judge0.js";

// Ignore trailing spaces on each line and trailing blank lines when comparing output
const normalize = (s) =>
  String(s ?? "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

// Maps a Judge0 result to our own status label
function classify(r, expected) {
  if (r.statusId === 6) return "compile_error";
  if (r.statusId === 5) return "time_limit";
  if (r.statusId >= 7 && r.statusId <= 12) return "runtime_error";
  if (r.statusId !== 3) return "error";
  return normalize(r.stdout) === normalize(expected) ? "passed" : "wrong_answer";
}

// Runs the code against the problem's test cases.
// onlyVisible = true -> sample cases only (the "Run" button)
// onlyVisible = false -> all cases (the "Submit" button)
export async function judgeProblem(problem, { language, code, onlyVisible }) {
  const tc = await pool.query(
    `SELECT id, input, expected_output, is_hidden
     FROM test_cases
     WHERE problem_id = $1 ${onlyVisible ? "AND is_hidden = FALSE" : ""}
     ORDER BY id`,
    [problem.id]
  );

  const cases = [];
  let passed = 0;
  let verdict = "accepted";

  for (const t of tc.rows) {
    const r = await runOnJudge0({
      language,
      code,
      stdin: t.input,
      timeLimitSec: problem.time_limit_sec,
      memoryLimitMb: problem.memory_limit_mb,
    });
    const status = classify(r, t.expected_output);
    if (status === "passed") passed++;
    else if (verdict === "accepted") verdict = status;

    // Hidden test cases never reveal their input or expected output
    cases.push(
      t.is_hidden
        ? { hidden: true, status }
        : {
            hidden: false,
            status,
            input: t.input,
            expected: t.expected_output,
            actual: r.stdout,
            error: r.compileOutput || r.stderr || "",
            time: r.time,
          }
    );

    // A compile error will be the same for every case, so stop early
    if (status === "compile_error") break;
  }

  if (tc.rows.length === 0) verdict = "no_tests";
  return { verdict, passed, total: tc.rows.length, cases };
}

export const pointsFor = (problem, passed, total) =>
  total === 0 ? 0 : Math.round(Number(problem.points) * (passed / total) * 100) / 100;

// Total score of an attempt = best submission per problem, summed
export async function codingScore(attemptId) {
  const r = await pool.query(
    `SELECT COALESCE(SUM(best), 0) AS total FROM (
       SELECT MAX(score) AS best FROM code_submissions
       WHERE attempt_id = $1 GROUP BY problem_id
     ) s`,
    [attemptId]
  );
  return Number(r.rows[0].total);
}