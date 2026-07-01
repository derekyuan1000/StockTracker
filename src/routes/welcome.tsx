import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
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

const TOTAL_STEPS = 2;

function WelcomePage() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [portfolioPublic, setPortfolioPublic] = useState(false);
  const [step, setStep] = useState(1);
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

  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      {/* Dark accent header band */}
      <header className="bg-[var(--canvas-dark)] px-6 py-10 text-[var(--on-dark)]">
        <div className="mx-auto max-w-md">
          <div className="mb-6 flex justify-between">
            <Logo size={26} showWordmark onDark />
            <span className="font-mono text-xs uppercase tracking-[0.08em] text-white/50">
              Step {step} of {TOTAL_STEPS}
            </span>
          </div>
          <p className="eyebrow text-white/50">Get started</p>
          <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--on-dark)]">
            {step === 1 ? "Set your visibility" : "Choose your look"}
          </h1>
          {/* Brand-gradient progress bar */}
          <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progress}%`, backgroundImage: "var(--gradient-brand)" }}
            />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 py-10">
        <div className="w-full max-w-md">
          {step === 1 && (
            <div>
              <h2 className="text-sm font-medium text-text-body">Portfolio visibility</h2>
              <p className="mt-0.5 text-xs text-text-muted">
                Would you like to share your trades with the community?
              </p>
              <div className="mt-4 grid grid-cols-1 gap-2">
                {[
                  { value: false, label: "Private", desc: "Only you can see your portfolio" },
                  {
                    value: true,
                    label: "Public",
                    desc: "Your trades appear on the community feed",
                  },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setPortfolioPublic(opt.value)}
                    className={`rounded-sm border px-4 py-3 text-left transition-colors ${
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

              <div className="mt-8 flex gap-3">
                <Button className="flex-1" onClick={() => setStep(2)}>
                  Continue
                </Button>
                <Button variant="ghost-line" onClick={handleSkip} disabled={saving}>
                  Skip
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-sm font-medium text-text-body">Appearance</h2>
              <p className="mt-0.5 text-xs text-text-muted">
                Pick the theme that suits you. You can change it any time in Settings.
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {THEMES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTheme(t.value)}
                    className={`rounded-sm border px-3 py-2.5 text-sm font-medium transition-colors ${
                      theme === t.value
                        ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] text-text-strong"
                        : "border-hairline text-text-muted hover:bg-[var(--surface-elevated)]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="mt-8 flex gap-3">
                <Button className="flex-1" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : "Get started"}
                </Button>
                <Button variant="ghost-line" onClick={() => setStep(1)} disabled={saving}>
                  Back
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
