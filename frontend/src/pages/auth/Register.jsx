import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { homePathFor, useAuth } from "../../context/AuthContext";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", role: "student", teacherCode: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already logged in: go to the right dashboard for this role
  if (user) return <Navigate to={homePathFor(user)} replace />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const created = await register(form);
      navigate(homePathFor(created), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const input =
    "w-full bg-surface-container-low text-on-surface rounded-lg px-space-sm py-2.5 focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-gutter">
      <form onSubmit={handleSubmit} className="bg-surface-container rounded-xl p-space-xl w-full max-w-md shadow-2xl flex flex-col gap-space-md">
        <div className="text-center">
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Create account</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Register to take or manage exams</p>
        </div>

        {error && (
          <div role="alert" className="bg-error-container text-on-error-container rounded-lg px-space-sm py-2 font-body-sm text-body-sm">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">FULL NAME</span>
          <input required value={form.name} onChange={set("name")} className={input} placeholder="Your name" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">EMAIL</span>
          <input type="email" required value={form.email} onChange={set("email")} className={input} placeholder="you@college.edu" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">PASSWORD (min 6 characters)</span>
          <input type="password" required minLength={6} value={form.password} onChange={set("password")} className={input} placeholder="••••••••" />
        </label>

        <div className="flex flex-col gap-1">
          <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">I AM A</span>
          <div className="grid grid-cols-2 gap-space-xs bg-surface-container-low p-space-xs rounded-lg" role="group" aria-label="Account type">
            {["student", "teacher"].map((r) => (
              <button
                type="button"
                key={r}
                aria-pressed={form.role === r}
                onClick={() => setForm((f) => ({ ...f, role: r }))}
                className={`py-2 rounded-lg capitalize font-semibold transition-all ${
                  form.role === r ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {form.role === "teacher" && (
          <label className="flex flex-col gap-1">
            <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">TEACHER CODE</span>
            <input required value={form.teacherCode} onChange={set("teacherCode")} className={input} placeholder="Given by your institute" />
          </label>
        )}

        <button
          type="submit"
          disabled={busy}
          className="py-2.5 rounded-lg bg-primary text-on-primary font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
        >
          {busy ? "Creating..." : "Register"}
        </button>

        <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}