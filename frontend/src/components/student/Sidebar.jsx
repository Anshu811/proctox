import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// Each item scrolls to a section of the student dashboard
const items = [
  { label: "Assessments", icon: "grid_view", target: "top" },
  { label: "MCQ Tests", icon: "quiz", target: "mcq" },
  { label: "Coding Tests", icon: "terminal", target: "coding" },
  { label: "My Results", icon: "history_edu", target: "results" },
];

export default function Sidebar({ open = false, onClose = () => {} }) {
  const { user } = useAuth();
  const [active, setActive] = useState("top");

  const goTo = (target) => {
    setActive(target);
    if (target === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    onClose();
  };

  return (
    <>
      {/* Dark backdrop behind the drawer on small screens */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[45] lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-surface-container-lowest/95 backdrop-blur-xl z-50 flex flex-col justify-between py-space-md px-space-md shadow-[0_1px_8px_rgba(0,0,0,0.04)] transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex flex-col gap-space-lg">
          {/* Brand */}
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-space-sm px-space-xs">
              <span className="material-symbols-outlined text-primary-container text-[28px]">shield_person</span>
              <span className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
                Procto<span className="text-primary-container">X</span>
              </span>
            </Link>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="lg:hidden p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>

          {/* Who is logged in (real data from login) */}
          <div className="flex items-center gap-space-sm p-space-sm bg-surface-container-low rounded-xl min-w-0">
            <span className="material-symbols-outlined text-primary text-[20px]">
              {user?.role === "teacher" ? "school" : "person"}
            </span>
            <div className="flex flex-col min-w-0">
              <span className="font-telemetry-label text-[10px] text-on-surface-variant uppercase">Logged in as</span>
              <span className="font-body-sm text-body-sm text-on-surface font-semibold truncate">{user?.name}</span>
              <span className="font-telemetry-label text-[10px] text-primary uppercase">{user?.role}</span>
            </div>
          </div>

          {/* Menu */}
          <nav aria-label="Dashboard sections" className="flex flex-col gap-space-xs">
            {items.map((item) => {
              const isActive = active === item.target;
              return (
                <button
                  key={item.label}
                  onClick={() => goTo(item.target)}
                  aria-current={isActive ? "true" : undefined}
                  className={
                    isActive
                      ? "flex items-center gap-space-sm px-space-md py-space-sm transition-all bg-primary-container text-on-primary-container font-semibold rounded-xl shadow-sm text-left"
                      : "flex items-center gap-space-sm px-space-md py-space-sm rounded-xl text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface transition-all text-left"
                  }
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  <span className="font-body-md text-body-md">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom info box (only says what the system really does) */}
        <div className="p-space-sm rounded-xl bg-surface-container-low flex flex-col gap-space-xs">
          <div className="flex items-center justify-between">
            <span className="font-telemetry-label text-telemetry-label text-tertiary uppercase">Tab Monitoring</span>
            <span className="material-symbols-outlined text-tertiary text-[16px]">tab_unselected</span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            During an exam, switching tabs is recorded as a warning.
          </p>
        </div>
      </aside>
    </>
  );
}