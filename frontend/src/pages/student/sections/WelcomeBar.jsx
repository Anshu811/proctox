export default function WelcomeBar({ user }) {
  const fullName = user?.name?.trim() || "Student";
  const firstName = fullName.split(" ")[0];
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-lg shadow-xl">
      <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary-container/10 blur-3xl pointer-events-none"></div>
      <div className="absolute -left-12 -bottom-12 w-64 h-64 rounded-full bg-tertiary-container/10 blur-2xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-space-lg">
        <div className="flex flex-col gap-space-xs min-w-0">
          <div className="flex items-center gap-space-sm flex-wrap">
            <span className="font-telemetry-label text-telemetry-label bg-surface-container-highest px-space-sm py-0.5 rounded text-primary uppercase">
              Student Portal
            </span>
            <span className="font-telemetry-label text-telemetry-label bg-tertiary-container/30 text-tertiary-fixed-dim px-space-sm py-0.5 rounded flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
              {today}
            </span>
          </div>

          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight break-words">
            Welcome back, {firstName}
          </h1>

          <p className="font-body-md text-body-md text-on-surface-variant flex items-center gap-space-xs min-w-0">
            <span className="material-symbols-outlined text-[18px] text-primary">mail</span>
            <span className="truncate">{user?.email}</span>
          </p>
        </div>

        <div className="flex flex-col gap-space-xs self-start md:self-auto bg-surface-container px-space-md py-space-sm rounded-lg shadow-inner">
          <span className="font-telemetry-label text-telemetry-label text-on-surface-variant uppercase">
            During an exam
          </span>
          <span className="font-body-sm text-body-sm text-on-surface flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-tertiary">timer</span>
            The timer is kept by the server
          </span>
          <span className="font-body-sm text-body-sm text-on-surface flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px] text-secondary">tab_unselected</span>
            Switching tabs counts as a warning
          </span>
        </div>
      </div>
    </div>
  );
}