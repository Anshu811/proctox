export default function Footer() {
  return (
    <footer className="w-full bg-surface-container-lowest text-on-surface-variant py-space-xl">
      <div className="w-full px-gutter-lg flex flex-col md:flex-row items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-primary-container">shield_person</span>
          <span className="font-telemetry-label text-telemetry-label text-on-surface tracking-wider uppercase">
            Procto<span className="text-primary-container">X</span> · Secure Online Exams
          </span>
        </div>
        <p className="font-body-sm text-body-sm">© 2026 ProctoX. All rights reserved.</p>
        <div className="flex items-center gap-space-md">
          <a href="#" className="font-body-sm text-body-sm hover:text-on-surface transition-colors">Security</a>
          <a href="#" className="font-body-sm text-body-sm hover:text-on-surface transition-colors">Code of Conduct</a>
          <a href="#" className="font-body-sm text-body-sm hover:text-on-surface transition-colors">Status</a>
        </div>
      </div>
    </footer>
  );
}