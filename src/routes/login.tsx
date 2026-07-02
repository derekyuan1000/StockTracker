import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { AppShell } from "@/components/AppShell";
import { useTheme } from "@/components/ThemeProvider";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z"
      />
    </svg>
  );
}

function LoginPage() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const onDark = resolvedTheme === "dark";

  useEffect(() => {
    if (session) void navigate({ to: "/dashboard" });
  }, [session, navigate]);

  async function signInWithGoogle() {
    setLoading(true);
    try {
      await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
    } catch {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingScreen label="Redirecting to Google…" />;
  }

  return (
    <AppShell fullBleed>
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-[400px]">
          <div
            className={`rounded-sm border p-9 ${
              onDark
                ? "border-white/[0.08] bg-[var(--surface-card)] shadow-[0_24px_64px_rgba(1,1,32,0.6)]"
                : "border-hairline bg-[var(--surface-card)] shadow-md"
            }`}
          >
            <div className="mb-7">
              <h1 className="text-2xl font-medium tracking-[-0.02em] text-text-strong">
                Sign in to StockTracker
              </h1>
              <p className="mt-1.5 text-sm text-text-muted">
                Track your portfolio. Share your edge.
              </p>
            </div>

            <div className="mb-6 h-px bg-hairline" />

            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="group flex w-full items-center justify-center gap-3 rounded-sm border border-hairline bg-[var(--surface-elevated)] px-5 py-3 text-sm font-medium text-text-body transition-all hover:border-[var(--primary)] hover:bg-[var(--canvas)] hover:text-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] disabled:pointer-events-none disabled:opacity-50"
            >
              <GoogleIcon />
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
