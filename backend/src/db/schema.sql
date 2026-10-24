CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  course_code TEXT,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'coding')),
  duration_minutes INT NOT NULL,
  negative_marking NUMERIC NOT NULL DEFAULT 0,
  max_violations INT NOT NULL DEFAULT 3,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mcq_questions (
  id SERIAL PRIMARY KEY,
  exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  options JSONB NOT NULL,
  correct_index INT NOT NULL,
  marks NUMERIC NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS coding_problems (
  id SERIAL PRIMARY KEY,
  exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  difficulty TEXT,
  description TEXT NOT NULL,
  constraints TEXT,
  points INT NOT NULL DEFAULT 10,
  starter_cpp TEXT,
  starter_python TEXT,
  time_limit_sec NUMERIC NOT NULL DEFAULT 1,
  memory_limit_mb INT NOT NULL DEFAULT 256
);

CREATE TABLE IF NOT EXISTS test_cases (
  id SERIAL PRIMARY KEY,
  problem_id INT NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS attempts (
  id SERIAL PRIMARY KEY,
  exam_id INT NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  score NUMERIC,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'submitted', 'auto_submitted')),
  violation_count INT NOT NULL DEFAULT 0,
  UNIQUE (exam_id, user_id)
);

CREATE TABLE IF NOT EXISTS mcq_answers (
  attempt_id INT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  question_id INT NOT NULL REFERENCES mcq_questions(id) ON DELETE CASCADE,
  selected_index INT,
  marked_for_review BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS code_submissions (
  id SERIAL PRIMARY KEY,
  attempt_id INT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  problem_id INT NOT NULL REFERENCES coding_problems(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT,
  passed_cases INT NOT NULL DEFAULT 0,
  total_cases INT NOT NULL DEFAULT 0,
  score NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS violations (
  id SERIAL PRIMARY KEY,
  attempt_id INT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Added in Phase 3: question ka topic (jaise "Transport Layer • TCP")
ALTER TABLE mcq_questions ADD COLUMN IF NOT EXISTS topic TEXT;