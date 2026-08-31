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

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 8l9 6 9-6M3 8v10a1 1 0 001 1h16a1 1 0 001-1V8M3 8a1 1 0 011-1h16a1 1 0 011 1" />
    </svg>
  );
}

function LoginPage() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const onDark = resolvedTheme === "dark";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [verifyEmail, setVerifyEmail] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState<string | null>(null);

  useEffect(() => {
    if (session) void navigate({ to: "/dashboard" });
  }, [session, navigate]);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setError(null);
    setUnverified(false);
    setForgotMode(false);
    setForgotSent(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setUnverified(false);
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error: err } = await authClient.signIn.email({
          email,
          password,
          callbackURL: "/dashboard",
        });
        if (err) {
          if (err.code === "EMAIL_NOT_VERIFIED") {
            setUnverified(true);
          } else if (err.code === "INVALID_EMAIL_OR_PASSWORD") {
            setError("Wrong email or password. Did you sign up with a social account?");
          } else {
            setError(err.message ?? "Sign in failed.");
          }
        }
      } else {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name.trim() || email.split("@")[0],
          callbackURL: "/dashboard",
        });
        if (err) {
          setError(err.message ?? "Sign up failed.");
        } else {
          setVerifyEmail(email);
        }
      }
    } finally {
      setLoading(false);
    }
  }

  async function resendVerification() {
    setResendLoading(true);
    try {
      await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" });
      setVerifyEmail(email);
      setUnverified(false);
      setError(null);
    } finally {
      setResendLoading(false);
    }
  }

  async function sendPasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await authClient.requestPasswordReset({
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (err) {
        setError(err.message ?? "Failed to send reset email.");
      } else {
        setForgotSent(email);
      }
    } finally {
      setLoading(false);
    }
  }

  async function signInWithSocial(provider: "google" | "github") {
    setSocialLoading(provider);
    try {
      await authClient.signIn.social({ provider, callbackURL: "/dashboard" });
    } catch {
      setSocialLoading(null);
    }
  }

  const cardCls = `rounded-sm border p-9 ${
    onDark
      ? "border-white/[0.08] bg-[var(--surface-card)] shadow-[0_24px_64px_rgba(1,1,32,0.6)]"
      : "border-hairline bg-[var(--surface-card)] shadow-md"
  }`;

  const inputCls =
    "w-full rounded-sm border border-hairline bg-[var(--surface-elevated)] px-3 py-2 text-sm text-text-strong placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/40";

  if (socialLoading) {
    const labels: Record<string, string> = {
      google: "Redirecting to Google…",
      github: "Redirecting to GitHub…",
    };
    return <LoadingScreen label={labels[socialLoading] ?? "Redirecting…"} />;
  }

  if (verifyEmail) {
    return (
      <AppShell fullBleed>
        <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
          <div className="w-full max-w-[400px]">
            <div className={cardCls}>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10">
                <span className="text-[var(--on-primary-muted,var(--primary))]">
                  <MailIcon />
                </span>
              </div>
              <h1 className="mb-2 text-xl font-medium tracking-[-0.02em] text-text-strong">
                Check your inbox
              </h1>
              <p className="mb-1 text-sm text-text-body">We sent a verification link to</p>
              <p className="mb-4 text-sm font-medium text-text-strong">{verifyEmail}</p>
              <p className="text-xs text-text-muted">
                Click the link in the email to activate your account. Check your spam folder if you
                don&apos;t see it.
              </p>
              <button
                onClick={() => {
                  setVerifyEmail(null);
                  setMode("signin");
                }}
                className="mt-6 text-xs text-[var(--primary)] hover:underline"
              >
                Back to sign in
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  if (forgotSent) {
    return (
      <AppShell fullBleed>
        <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
          <div className="w-full max-w-[400px]">
            <div className={cardCls}>
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--primary)]/10">
                <span className="text-[var(--primary)]">
                  <MailIcon />
                </span>
              </div>
              <h1 className="mb-2 text-xl font-medium tracking-[-0.02em] text-text-strong">
                Check your inbox
              </h1>
              <p className="mb-1 text-sm text-text-body">We sent a password reset link to</p>
              <p className="mb-4 text-sm font-medium text-text-strong">{forgotSent}</p>
              <p className="text-xs text-text-muted">
                Click the link in the email to set a new password. Check your spam folder if you
                don&apos;t see it.
              </p>
              <button
                onClick={() => {
                  setForgotSent(null);
                  setForgotMode(false);
                  setMode("signin");
                }}
                className="mt-6 text-xs text-[var(--primary)] hover:underline"
              >
                Back to sign in
              </button>
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell fullBleed>
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-16">
        <div className="w-full max-w-[400px]">
          <div className={cardCls}>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl font-medium tracking-[-0.02em] text-text-strong">
                {forgotMode
                  ? "Reset your password"
                  : mode === "signin"
                    ? "Sign in to StockTracker"
                    : "Create your account"}
              </h1>
              <p className="mt-1.5 text-sm text-text-muted">
                {forgotMode
                  ? "Enter your email and we'll send you a reset link."
                  : "Track your portfolio. Share your edge."}
              </p>
            </div>

            {/* Mode tabs — hidden in forgot mode */}
            {!forgotMode && (
              <div className="mb-6 flex rounded-sm border border-hairline bg-[var(--surface-elevated)] p-0.5">
                {(["signin", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => switchMode(m)}
                    className={`flex-1 rounded-[3px] py-1.5 text-xs font-medium transition-colors ${
                      mode === m
                        ? "bg-[var(--canvas)] text-text-strong shadow-sm"
                        : "text-text-muted hover:text-text-body"
                    }`}
                  >
                    {m === "signin" ? "Sign in" : "Sign up"}
                  </button>
                ))}
              </div>
            )}

            {/* Forgot password form */}
            {forgotMode ? (
              <form onSubmit={sendPasswordReset} className="space-y-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputCls}
                  autoComplete="email"
                  autoFocus
                />
                {error && <p className="text-xs text-[var(--down)]">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-sm bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--on-primary)] transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? "…" : "Send reset link"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setError(null);
                  }}
                  className="w-full text-center text-xs text-text-muted hover:text-text-body"
                >
                  Back to sign in
                </button>
              </form>
            ) : (
              <>
                {/* Email/password form */}
                <form onSubmit={handleSubmit} className="space-y-3">
                  {mode === "signup" && (
                    <input
                      type="text"
                      placeholder="Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputCls}
                      autoComplete="name"
                    />
                  )}
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setUnverified(false);
                    }}
                    required
                    className={inputCls}
                    autoComplete="email"
                  />
                  <div className="space-y-1">
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={8}
                      className={inputCls}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    />
                    {mode === "signin" && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setForgotMode(true);
                            setError(null);
                            setUnverified(false);
                          }}
                          className="text-xs text-text-muted hover:text-text-body"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Error / unverified states */}
                  {unverified ? (
                    <div className="rounded-sm border border-[var(--down)]/20 bg-[var(--down)]/5 px-3 py-2.5">
                      <p className="text-xs text-[var(--down)]">
                        Your email hasn&apos;t been verified yet.
                      </p>
                      <button
                        type="button"
                        onClick={resendVerification}
                        disabled={resendLoading}
                        className="mt-1 text-xs font-medium text-[var(--primary)] hover:underline disabled:opacity-50"
                      >
                        {resendLoading ? "Sending…" : "Resend verification email"}
                      </button>
                    </div>
                  ) : error ? (
                    <p className="text-xs text-[var(--down)]">{error}</p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-sm bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--on-primary)] transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? "…" : mode === "signin" ? "Sign in" : "Create account"}
                  </button>
                </form>

                {/* Divider */}
                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-hairline" />
                  <span className="text-xs text-text-muted">or</span>
                  <div className="h-px flex-1 bg-hairline" />
                </div>

                {/* Social providers */}
                <div className="space-y-2">
                  {(
                    [
                      { provider: "google", label: "Continue with Google", Icon: GoogleIcon },
                      { provider: "github", label: "Continue with GitHub", Icon: GitHubIcon },
                    ] as const
                  ).map(({ provider, label, Icon }) => (
                    <button
                      key={provider}
                      onClick={() => signInWithSocial(provider)}
                      disabled={!!socialLoading}
                      className="group flex w-full items-center justify-center gap-3 rounded-sm border border-hairline bg-[var(--surface-elevated)] px-5 py-3 text-sm font-medium text-text-body transition-all hover:border-[var(--primary)] hover:bg-[var(--canvas)] hover:text-text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] disabled:pointer-events-none disabled:opacity-50"
                    >
                      <Icon />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
