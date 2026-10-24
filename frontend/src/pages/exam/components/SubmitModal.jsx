export default function SubmitModal({ open, title, answered, marked, unanswered, onCancel, onConfirm }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-gutter bg-surface-container-lowest/80 backdrop-blur-md">
      <div className="bg-surface-container rounded-xl p-space-xl max-w-lg w-full shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center mb-space-md">
          <span className="material-symbols-outlined text-[28px]">notification_important</span>
        </div>
        <h3 className="font-headline-md text-headline-md text-on-surface font-bold mb-space-xs">Submit Assessment?</h3>
        <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
          You are about to permanently submit <strong className="text-on-surface">{title}</strong>. You cannot change answers after this.
        </p>

        <div className="grid grid-cols-3 gap-space-sm bg-surface-container-low p-space-md rounded-lg mb-space-lg text-center font-telemetry-label text-telemetry-label">
          <div>
            <span className="block text-headline-md text-tertiary font-bold">{answered}</span>
            <span className="text-on-surface-variant uppercase text-[10px]">Answered</span>
          </div>
          <div>
            <span className="block text-headline-md text-secondary font-bold">{marked}</span>
            <span className="text-on-surface-variant uppercase text-[10px]">Marked</span>
          </div>
          <div>
            <span className="block text-headline-md text-on-surface-variant font-bold">{unanswered}</span>
            <span className="text-on-surface-variant uppercase text-[10px]">Unanswered</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-space-sm">
          <button onClick={onCancel} className="px-space-md py-2.5 rounded-lg bg-surface-container-highest hover:bg-surface-bright text-on-surface font-body-md text-body-md font-semibold transition-colors">
            Continue Exam
          </button>
          <button onClick={onConfirm} className="px-space-lg py-2.5 rounded-lg bg-primary-container text-on-primary-container font-body-md text-body-md font-semibold hover:brightness-110 active:scale-95 transition-all shadow-md">
            Confirm Submission
          </button>
        </div>
      </div>
    </div>
  );
}