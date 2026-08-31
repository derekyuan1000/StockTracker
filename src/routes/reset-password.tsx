import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AppShell } from "@/components/AppShell";
import { useTheme } from "@/components/ThemeProvider";

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    token: String(search.token ?? ""),
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const onDark = resolvedTheme === "dark";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const cardCls = `rounded-sm border p-9 ${
    onDark
      ? "border-white/[0.08] bg-[var(--surface-card)] shadow-[0_24px_64px_rgba(1,1,32,0.6)]"
      : "border-hairline bg-[var(--surface-card)] shadow-md"
  }`;

  const inputCls =
    "w-full rounded-sm border border-hairline bg-[var(--surface-elevated)] px-3 py-2 text-sm text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/40";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await authClient.resetPassword({ newPassword: password, token });
      if (err) {
        setError(err.message ?? "Reset failed. The link may have expired.");
      } else {
        setDone(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell fullBleed>
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-[400px]">
          <div className={cardCls}>
            {done ? (
              <>
                <h1 className="mb-2 text-xl font-medium tracking-[-0.02em] text-text-strong">
                  Password updated
                </h1>
                <p className="mb-6 text-sm text-text-muted">
                  Your password has been reset. You can now sign in with your new password.
                </p>
                <button
                  onClick={() => void navigate({ to: "/login" })}
                  className="w-full rounded-sm bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--on-primary)] transition-opacity hover:opacity-90"
                >
                  Go to sign in
                </button>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-medium tracking-[-0.02em] text-text-strong">
                    Set new password
                  </h1>
                  <p className="mt-1.5 text-sm text-text-muted">Must be at least 8 characters.</p>
                </div>
                {!token && (
                  <p className="mb-4 text-sm text-[var(--down)]">
                    Invalid or missing reset token. Please request a new link.
                  </p>
                )}
                <form onSubmit={handleSubmit} className="space-y-3">
                  <input
                    type="password"
                    placeholder="New password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className={inputCls}
                    autoComplete="new-password"
                    autoFocus
                  />
                  <input
                    type="password"
                    placeholder="Confirm password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    minLength={8}
                    className={inputCls}
                    autoComplete="new-password"
                  />
                  {error && <p className="text-xs text-[var(--down)]">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || !token}
                    className="w-full rounded-sm bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--on-primary)] transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? "…" : "Reset password"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
