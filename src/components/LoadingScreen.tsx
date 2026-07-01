import { Logo } from "./Logo";

export function LoadingScreen({ label = "Loading your portfolio…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-canvas text-text-body"
    >
      <div className="splash-breathe">
        <Logo size={24} showWordmark />
      </div>

      {/* Indeterminate fill bar */}
      <div className="relative h-1 w-44 overflow-hidden rounded-full bg-[var(--surface-elevated)]">
        <div className="splash-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-[var(--primary)]" />
      </div>

      <span className="text-xs font-medium text-text-muted">{label}</span>
    </div>
  );
}
