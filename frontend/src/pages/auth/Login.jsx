import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { homePathFor, useAuth } from "../../context/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Already logged in: go to the right dashboard for this role
  if (user) return <Navigate to={homePathFor(user)} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const loggedIn = await login(email, password);
      // Teachers always land on their dashboard.
      // Students return to the page they were trying to open, if any.
      const destination =
        loggedIn.role === "teacher" ? "/teacher" : location.state?.from || "/student";
      navigate(destination, { replace: true });
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
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Welcome back</h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Login to continue to your exams</p>
        </div>

        {error && (
          <div role="alert" className="bg-error-container text-on-error-container rounded-lg px-space-sm py-2 font-body-sm text-body-sm">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-1">
          <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">EMAIL</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={input} placeholder="you@college.edu" />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-telemetry-label text-telemetry-label text-on-surface-variant">PASSWORD</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className={input} placeholder="••••••••" />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="py-2.5 rounded-lg bg-primary text-on-primary font-bold hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
        >
          {busy ? "Logging in..." : "Login"}
        </button>

        <p className="text-center font-body-sm text-body-sm text-on-surface-variant">
          New here?{" "}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </div>
  );
}