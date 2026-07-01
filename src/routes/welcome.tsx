import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { useTheme } from "@/components/ThemeProvider";
import { updateSettings } from "@/fns/settings";
import type { Theme } from "@/components/ThemeProvider";

export const Route = createFileRoute("/welcome")({
  component: WelcomePage,
});

const THEMES: { value: Theme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
];

function WelcomePage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [portfolioPublic, setPortfolioPublic] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateSettings({ data: { portfolioPublic, theme, onboarded: true } });
      navigate({ to: "/dashboard" });
    } catch {
      toast.error("Something went wrong. Please try again.");
      setSaving(false);
    }
  }

  async function handleSkip() {
    setSaving(true);
    try {
      await updateSettings({ data: { onboarded: true } });
      navigate({ to: "/dashboard" });
    } catch {
      setSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo size={28} showWordmark />
        </div>

        <div className="rounded-sm border border-hairline bg-[var(--surface-card)] p-8">
          <h1 className="text-xl font-bold tracking-tight text-text-strong">Welcome!</h1>
          <p className="mt-2 text-sm text-text-muted">
            Take a moment to set your preferences. You can change these any time in Settings.
          </p>

          {/* Portfolio visibility */}
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-text-body">Portfolio visibility</h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Would you like to share your trades with the community?
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { value: false, label: "Private", desc: "Only you can see your portfolio" },
                { value: true, label: "Public", desc: "Your trades appear on the community feed" },
              ].map((opt) => (
                <button
                  key={String(opt.value)}
                  onClick={() => setPortfolioPublic(opt.value)}
                  className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                    portfolioPublic === opt.value
                      ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
                      : "border-hairline hover:bg-[var(--surface-elevated)]"
                  }`}
                >
                  <p className="text-sm font-medium text-text-strong">{opt.label}</p>
                  <p className="mt-0.5 text-[11px] text-text-muted">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Theme */}
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-text-body">Appearance</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setTheme(t.value)}
                  className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors ${
                    theme === t.value
                      ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] text-text-strong"
                      : "border-hairline text-text-muted hover:bg-[var(--surface-elevated)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-md bg-[var(--primary)] py-2.5 text-sm font-semibold text-[var(--on-primary)] transition-colors hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Get started"}
            </button>
            <button
              onClick={handleSkip}
              disabled={saving}
              className="rounded-md border border-hairline px-4 py-2.5 text-sm text-text-muted transition-colors hover:text-text-body disabled:opacity-60"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
