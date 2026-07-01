import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [loading, setLoading] = useState(false);

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
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-text-body">
      <div className="w-full max-w-sm rounded-lg border border-hairline bg-canvas p-8 shadow-sm">
        <div className="mb-6">
          <Logo size={20} showWordmark />
        </div>
        <h1 className="text-xl font-semibold tracking-tight text-text-strong">Sign in</h1>
        <p className="mt-2 text-sm text-text-muted">Sign in to view and manage your portfolio.</p>
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-md border border-hairline bg-background px-4 py-2.5 text-sm font-medium text-text-body transition-colors hover:bg-accent disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
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
          {loading ? "Redirecting…" : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}
