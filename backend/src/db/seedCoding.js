import { pool } from "./pool.js";

// Seeds one coding exam with 3 problems. Safe to run more than once.

const EXAM_TITLE = "CS402: Data Structures Lab";

const CPP_SUM = `#include <bits/stdc++.h>
using namespace std;

int main() {
    int n;
    cin >> n;
    // Write your solution here
    return 0;
}
`;

const PY_SUM = `n = int(input())
nums = list(map(int, input().split()))
# Write your solution here
`;

const CPP_STR = `#include <bits/stdc++.h>
using namespace std;

int main() {
    string s;
    cin >> s;
    // Write your solution here
    return 0;
}
`;

const PY_STR = `s = input().strip()
# Write your solution here
`;

const problems = [
  {
    title: "Sum of Array",
    difficulty: "Easy",
    points: 10,
    description:
      "Given an array of n integers, print the sum of all its elements.\n\n" +
      "Input format:\n" +
      "Line 1: an integer n\n" +
      "Line 2: n space-separated integers\n\n" +
      "Output format:\n" +
      "A single integer, the sum of the array.",
    constraints: "1 <= n <= 100000\n-10^9 <= a[i] <= 10^9\nThe sum can exceed 32 bits, so use a 64-bit type.",
    starter_cpp: CPP_SUM,
    starter_python: PY_SUM,
    cases: [
      { input: "5\n1 2 3 4 5\n", output: "15\n", hidden: false },
      { input: "3\n-1 -2 -3\n", output: "-6\n", hidden: false },
      { input: "4\n0 0 0 0\n", output: "0\n", hidden: true },
      { input: "6\n1000000 2000000 3000000 -500000 7 8\n", output: "5500015\n", hidden: true },
      { input: "3\n1000000000 1000000000 1000000000\n", output: "3000000000\n", hidden: true },
    ],
  },
  {
    title: "Palindrome Check",
    difficulty: "Easy",
    points: 10,
    description:
      "Given a string, print YES if it reads the same forwards and backwards, otherwise print NO.\n\n" +
      "Input format:\n" +
      "A single line containing a string of lowercase letters (no spaces).\n\n" +
      "Output format:\n" +
      "YES or NO (uppercase).",
    constraints: "1 <= length of string <= 100000",
    starter_cpp: CPP_STR,
    starter_python: PY_STR,
    cases: [
      { input: "madam\n", output: "YES\n", hidden: false },
      { input: "hello\n", output: "NO\n", hidden: false },
      { input: "a\n", output: "YES\n", hidden: true },
      { input: "abccba\n", output: "YES\n", hidden: true },
      { input: "abca\n", output: "NO\n", hidden: true },
      { input: "racecar\n", output: "YES\n", hidden: true },
    ],
  },
  {
    title: "Maximum Subarray Sum",
    difficulty: "Medium",
    points: 20,
    description:
      "Given an array of n integers, find the maximum possible sum of a non-empty contiguous subarray.\n\n" +
      "Input format:\n" +
      "Line 1: an integer n\n" +
      "Line 2: n space-separated integers\n\n" +
      "Output format:\n" +
      "A single integer, the maximum subarray sum.",
    constraints: "1 <= n <= 100000\n-10^4 <= a[i] <= 10^4\nAim for O(n) time.",
    starter_cpp: CPP_SUM,
    starter_python: PY_SUM,
    cases: [
      { input: "9\n-2 1 -3 4 -1 2 1 -5 4\n", output: "6\n", hidden: false },
      { input: "5\n1 2 3 4 5\n", output: "15\n", hidden: false },
      { input: "3\n-3 -1 -2\n", output: "-1\n", hidden: true },
      { input: "1\n-7\n", output: "-7\n", hidden: true },
      { input: "6\n5 -9 6 -2 3 -1\n", output: "7\n", hidden: true },
      { input: "5\n2 -1 2 3 -9\n", output: "6\n", hidden: true },
    ],
  },
];

async function main() {
  const client = await pool.connect();
  try {
    const existing = await client.query("SELECT id FROM exams WHERE title = $1", [EXAM_TITLE]);
    if (existing.rowCount > 0) {
      console.log(`Coding exam already exists (id ${existing.rows[0].id}). Nothing to do.`);
      return;
    }

    await client.query("BEGIN");

    const exam = await client.query(
      `INSERT INTO exams (title, course_code, description, type, duration_minutes, negative_marking, max_violations)
       VALUES ($1, 'CS402', 'Coding Exam', 'coding', 45, 0, 3)
       RETURNING id`,
      [EXAM_TITLE]
    );
    const examId = exam.rows[0].id;

    for (const p of problems) {
      const prob = await client.query(
        `INSERT INTO coding_problems
           (exam_id, title, difficulty, description, constraints, points, starter_cpp, starter_python)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [examId, p.title, p.difficulty, p.description, p.constraints, p.points, p.starter_cpp, p.starter_python]
      );
      const problemId = prob.rows[0].id;

      for (const c of p.cases) {
        await client.query(
          `INSERT INTO test_cases (problem_id, input, expected_output, is_hidden)
           VALUES ($1, $2, $3, $4)`,
          [problemId, c.input, c.output, c.hidden]
        );
      }
    }

    await client.query("COMMIT");
    console.log(`Seeded coding exam (id ${examId}) with ${problems.length} problems.`);
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Seeding failed:", e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();