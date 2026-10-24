import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function Hero() {
  const [seconds, setSeconds] = useState(42 * 60 + 15);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <section className="w-full px-gutter-lg py-space-xl lg:py-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
        {/* LEFT: text */}
        <div className="lg:col-span-7 flex flex-col gap-space-lg">
          <div className="inline-flex items-center gap-space-sm self-start px-space-md py-1.5 rounded-full bg-surface-container-high/90 shadow-sm backdrop-blur-md">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-fixed opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary"></span>
            </span>
            <span className="font-telemetry-label text-telemetry-label text-primary-fixed tracking-widest uppercase">
              Proctored. Randomized. Auto-graded.
            </span>
          </div>

          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight lg:text-5xl lg:leading-[1.12]">
            The Smarter Way to Conduct{" "}
            <span className="bg-gradient-to-r from-primary via-secondary to-tertiary-fixed-dim bg-clip-text text-transparent">
              Online Exams
            </span>
          </h1>

          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
            ProctoX lets colleges run secure MCQ tests and automated Python & C++ coding exams
            with webcam proctoring and tab-switch detection.
          </p>

          <div className="flex flex-wrap items-center gap-space-md pt-space-xs">
            <Link to="/student" className="inline-flex items-center justify-center gap-space-sm px-space-xl py-3.5 rounded-lg bg-gradient-to-r from-primary-container to-secondary-container text-on-primary-container font-headline-md text-body-md shadow-[0_0_24px_rgba(124,58,237,0.4)] hover:brightness-110 transition-all">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
              <span>Start as Student</span>
            </Link>
            <a href="#" className="inline-flex items-center justify-center gap-space-sm px-space-xl py-3.5 rounded-lg bg-surface-container-high/80 text-on-surface hover:bg-surface-container-highest transition-all shadow-md">
              <span className="material-symbols-outlined text-[20px]">badge</span>
              <span>Login as Teacher</span>
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-space-lg pt-space-sm font-telemetry-label text-telemetry-label text-on-surface-variant">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-[18px]">verified</span>
              <span>Webcam Proctoring</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">memory</span>
              <span>Isolated Code Runner</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">lock</span>
              <span>Secure Login (JWT)</span>
            </div>
          </div>
        </div>

        {/* RIGHT: IDE mockup */}
        <div className="lg:col-span-5 relative">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-primary-container/30 to-secondary-container/20 blur-xl opacity-70"></div>
          <div className="relative rounded-xl bg-surface-container-lowest/90 backdrop-blur-xl shadow-2xl p-space-md flex flex-col gap-space-md">
            {/* header */}
            <div className="flex items-center justify-between pb-space-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-error/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-outline/50 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-tertiary/80 inline-block"></span>
                <span className="font-telemetry-label text-telemetry-label text-on-surface-variant ml-2">dfs_islands.py · Python 3.12</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-high font-timer-display text-body-sm text-on-surface font-semibold tracking-wider">
                  <span className="material-symbols-outlined text-error text-[14px]">timer</span>
                  <span>{mm}:{ss}</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-tertiary-container/30 text-on-tertiary-container font-telemetry-label text-telemetry-label">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                  <span>0 Violations · Safe</span>
                </div>
              </div>
            </div>

            {/* code */}
            <div className="bg-surface-container-low rounded-lg p-space-md font-code-md text-code-md text-on-surface leading-relaxed overflow-x-auto">
              <div className="flex">
                <div className="select-none text-outline-variant pr-space-md text-right flex flex-col opacity-60">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <span key={n}>{String(n).padStart(2, "0")}</span>
                  ))}
                </div>
                <div className="flex-1 font-code-md">
                  <div className="whitespace-pre"><span className="text-primary font-semibold">def</span> <span className="text-secondary font-semibold">numIslands</span>(grid: list[list[str]]) -&gt; int:</div>
                  <div className="whitespace-pre">{"    "}<span className="text-tertiary">if</span> <span className="text-outline">not</span> grid: <span className="text-primary font-semibold">return</span> <span className="text-tertiary-fixed-dim">0</span></div>
                  <div className="whitespace-pre">{"    "}rows, cols = len(grid), len(grid[<span className="text-tertiary-fixed-dim">0</span>])</div>
                  <div className="whitespace-pre">{"    "}count = <span className="text-tertiary-fixed-dim">0</span></div>
                  <div className="whitespace-pre">{"    "}<span className="text-primary font-semibold">def</span> <span className="text-secondary">traverse</span>(r, c):</div>
                  <div className="whitespace-pre">{"        "}<span className="text-tertiary">if</span> r &lt; <span className="text-tertiary-fixed-dim">0</span> <span className="text-outline">or</span> c &lt; <span className="text-tertiary-fixed-dim">0</span> <span className="text-outline">or</span> r &gt;= rows ...:</div>
                  <div className="whitespace-pre">{"            "}<span className="text-primary font-semibold">return</span></div>
                  <div className="whitespace-pre">{"        "}grid[r][c] = <span className="text-on-tertiary-fixed-variant">"0"</span></div>
                  <div className="whitespace-pre">{"        "}<span className="text-outline-variant"># Recursive 4-directional sink</span></div>
                </div>
              </div>
            </div>

            {/* results */}
            <div className="bg-surface-container rounded-lg p-space-sm flex flex-col gap-space-xs">
              <div className="flex items-center justify-between font-telemetry-label text-telemetry-label text-on-surface-variant">
                <span>RUN RESULTS</span>
                <span className="text-tertiary">38ms · Memory 14.2 MB</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {["Sample 1: Accepted", "Sample 2: Accepted"].map((t) => (
                  <div key={t} className="flex items-center gap-1.5 px-space-sm py-1 rounded bg-tertiary-container/30 text-on-tertiary-container font-telemetry-label text-telemetry-label">
                    <span className="material-symbols-outlined text-[16px] text-tertiary">check_circle</span>
                    <span>{t}</span>
                  </div>
                ))}
                <div className="px-space-sm py-1 rounded bg-surface-container-high text-on-surface-variant font-telemetry-label text-telemetry-label">
                  8 Hidden Cases Locked
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}