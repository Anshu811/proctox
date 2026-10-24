// Thin client for Judge0. Works with the public instance (no key) or a keyed one.

// Judge0 language IDs (see GET /languages on your Judge0 instance)
const LANGUAGES = {
  cpp: 105, // C++ (GCC 14.1.0)
  python: 71, // Python (3.8.1)
};

const toB64 = (s) => Buffer.from(s ?? "", "utf8").toString("base64");
const fromB64 = (s) => (s ? Buffer.from(s, "base64").toString("utf8") : "");

export const isSupportedLanguage = (lang) => Object.hasOwn(LANGUAGES, lang);

// Runs one program against one input and returns the raw result.
export async function runOnJudge0({ language, code, stdin, timeLimitSec, memoryLimitMb }) {
  const base = process.env.JUDGE0_URL || "https://ce.judge0.com";

  const headers = { "Content-Type": "application/json" };
  if (process.env.JUDGE0_KEY) {
    headers["x-rapidapi-key"] = process.env.JUDGE0_KEY;
    headers["x-rapidapi-host"] = process.env.JUDGE0_HOST;
  }

  const res = await fetch(`${base}/submissions?base64_encoded=true&wait=true`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      source_code: toB64(code),
      language_id: LANGUAGES[language],
      stdin: toB64(stdin),
      cpu_time_limit: Number(timeLimitSec) || 1,
      memory_limit: (Number(memoryLimitMb) || 256) * 1024, // Judge0 expects KB
    }),
  });

  if (!res.ok) throw new Error(`Judge0 request failed with status ${res.status}`);
  const d = await res.json();

  return {
    statusId: d.status?.id,
    statusText: d.status?.description,
    stdout: fromB64(d.stdout),
    stderr: fromB64(d.stderr),
    compileOutput: fromB64(d.compile_output),
    time: d.time,
    memory: d.memory,
  };
}