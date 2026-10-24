import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  { label: "Home", to: "/" },
  { label: "MCQ Tests", to: "#" },
  { label: "Coding Tests", to: "#" },
  { label: "Features", to: "#" },
  { label: "Proctoring & Security", to: "#" },
];

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const initial = user?.name?.trim()?.[0]?.toUpperCase() || "?";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
      <div className="h-16 w-full px-gutter-lg flex items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-lg">
          <Link to="/" className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary-container text-[28px]">shield_person</span>
            <span className="font-headline-md text-headline-md tracking-tight text-on-surface">
              Procto<span className="text-primary-container">X</span>
            </span>
          </Link>
          <nav className="hidden xl:flex items-center gap-space-xs">
            {links.map((l, i) => (
              <Link
                key={l.label}
                to={l.to}
                className={
                  i === 0
                    ? "px-space-sm py-space-xs bg-primary-container text-on-primary-container font-headline-md rounded-lg shadow-sm"
                    : "px-space-sm py-space-xs rounded-lg font-body-md text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                }
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-space-md">
          {loading ? null : user ? (
            <>
              <Link
                to="/student"
                className="hidden md:inline-block px-space-sm py-space-xs rounded-lg font-body-sm text-body-sm bg-primary-container text-on-primary-container hover:brightness-110 transition-all"
              >
                Dashboard
              </Link>

              <div className="flex items-center gap-space-sm pl-space-xs">
                <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-semibold">
                  {initial}
                </div>
                <div className="hidden lg:flex flex-col text-left">
                  <span className="font-body-md text-body-md text-on-surface font-semibold leading-tight">{user.name}</span>
                  <span className="font-telemetry-label text-telemetry-label text-on-surface-variant uppercase">{user.role}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1 px-space-sm py-space-xs rounded-lg font-body-sm text-body-sm text-on-surface-variant hover:text-error hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="px-space-sm py-space-xs rounded-lg font-body-md text-body-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="px-space-md py-space-xs rounded-lg bg-primary-container text-on-primary-container font-body-md text-body-md font-semibold hover:brightness-110 active:scale-95 transition-all"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}