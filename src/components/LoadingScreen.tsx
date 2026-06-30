/**
 * Full-screen branded splash. Used as the router's default pending component
 * (shown during slow route loaders) and during the auth redirect on /login.
 * Intentionally chrome-free so it is safe in both authed and unauthed contexts.
 */
export function LoadingScreen({ label = "Loading your portfolio…" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-6 bg-canvas text-text-body"
    >
      <div className="flex items-center gap-2.5">
        <span className="splash-breathe inline-block size-4 rounded-sm bg-[var(--primary)]" />
        <span className="text-base font-bold tracking-tight text-[var(--primary)]">
          StockTracker
        </span>
      </div>

      {/* Indeterminate fill bar */}
      <div className="relative h-1 w-44 overflow-hidden rounded-full bg-[var(--surface-elevated)]">
        <div className="splash-bar absolute inset-y-0 left-0 w-1/3 rounded-full bg-[var(--primary)]" />
      </div>

      <span className="text-xs font-medium text-text-muted">{label}</span>
    </div>
  );
}
