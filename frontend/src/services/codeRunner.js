// PLACEHOLDER: abhi backend nahi hai, isliye code actually run nahi hota.
// Backend ke baad yahan fetch("/api/run", ...) aayega.

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function runCode(problem, language, code, includeHidden = false) {
  await wait(800);

  const cases = problem.samples.map((s) => ({
    name: s.title,
    hidden: false,
    status: "NOT_RUN",
    detail: "Backend not connected yet",
  }));

  if (includeHidden) {
    for (let i = 1; i <= problem.hiddenCount; i++) {
      cases.push({
        name: `Hidden Case #${i}`,
        hidden: true,
        status: "NOT_RUN",
        detail: "Backend not connected yet",
      });
    }
  }

  return {
    connected: false,
    output: "Code execution server is not connected yet. Your code was NOT run.",
    cases,
  };
}