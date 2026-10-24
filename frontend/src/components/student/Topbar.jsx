import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Only links that go somewhere real
const links = [
  { label: "Dashboard", to: "/student", end: true },
  { label: "Home", to: "/", end: true },
];

export default function Topbar({ onMenu = () => {} }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const initial = user?.name?.trim()?.[0]?.toUpperCase() || "?";

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-surface-container-lowest/80 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 flex items-center justify-between px-gutter-lg gap-space-md">
      <div className="flex items-center gap-space-sm">
        {/* Menu button (only on screens where the sidebar is hidden) */}
        <button
          onClick={onMenu}
          aria-label="Open menu"
          className="lg:hidden p-space-xs rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined text-[24px]">menu</span>
        </button>

        <nav aria-label="Main" className="hidden sm:flex items-center gap-space-sm">
          {links.map((l) => (
            <NavLink
              key={l.label}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `px-space-sm py-space-xs rounded-lg font-body-md text-body-md transition-colors ${
                  isActive
                    ? "bg-surface-container-high text-on-surface font-semibold"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-space-md min-w-0">
        <div className="flex items-center gap-space-sm min-w-0">
          <div className="w-8 h-8 shrink-0 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-semibold">
            {initial}
          </div>
          <div className="hidden sm:flex flex-col text-left min-w-0">
            <span className="font-body-md text-body-md text-on-surface font-semibold leading-tight truncate">{user?.name}</span>
            <span className="font-telemetry-label text-telemetry-label text-on-surface-variant uppercase">{user?.role}</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1 px-space-sm py-space-xs rounded-lg font-body-sm text-body-sm text-on-surface-variant hover:text-error hover:bg-surface-container-high transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">logout</span>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}