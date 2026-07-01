import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useTheme } from "@/components/ThemeProvider";
import { getSettings, updateSettings, type UserSettings } from "@/fns/settings";
import type { Theme } from "@/components/ThemeProvider";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[var(--primary)]" : "bg-[var(--surface-elevated)]"
      }`}
    >
      <span
        className={`inline-block size-5 rounded-full bg-white transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-[var(--surface-card)] p-6">
      <div className="mb-4">
        <h2 className="text-base font-semibold text-text-strong">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-text-muted">{description}</p>}
      </div>
      {children}
    </div>
  );
}

const THEMES: { value: Theme; label: string; description: string }[] = [
  { value: "dark", label: "Dark", description: "Easy on the eyes in low light" },
  { value: "light", label: "Light", description: "Classic bright interface" },
  { value: "system", label: "System", description: "Follows your OS preference" },
];

function SettingsPage() {
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => getSettings(),
  });

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (data: Partial<UserSettings>) => updateSettings({ data }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Settings saved");
    },
    onError: () => toast.error("Failed to save settings"),
  });

  if (isLoading || !settings) {
    return (
      <AppShell>
        <div className="max-w-2xl space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-lg bg-[var(--surface-elevated)]" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl">
        <h1 className="mb-6 text-2xl font-medium tracking-tight text-text-strong">Settings</h1>

        <div className="space-y-4">
          {/* Visibility */}
          <SectionCard
            title="Portfolio visibility"
            description="When enabled, your display name and trade history will appear on the community feed and leaderboard."
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-text-body">Public portfolio</p>
                <p className="text-xs text-text-muted">
                  Your name and trades are visible to everyone
                </p>
              </div>
              <button
                role="switch"
                aria-checked={settings.portfolioPublic}
                disabled={saving}
                onClick={() => save({ portfolioPublic: !settings.portfolioPublic })}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-50 ${
                  settings.portfolioPublic ? "bg-[var(--primary)]" : "bg-[var(--surface-elevated)]"
                }`}
              >
                <span
                  className={`inline-block size-5 rounded-full bg-white transition-transform ${
                    settings.portfolioPublic ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </SectionCard>

          {/* Appearance */}
          <SectionCard title="Appearance" description="Choose how StockTracker looks for you.">
            <div className="grid gap-2 sm:grid-cols-3">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  disabled={saving}
                  onClick={() => {
                    setTheme(t.value);
                    save({ theme: t.value });
                  }}
                  className={`rounded-md border px-4 py-3 text-left transition-colors ${
                    theme === t.value
                      ? "border-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
                      : "border-hairline hover:border-[var(--primary)] hover:bg-[var(--surface-elevated)]"
                  }`}
                >
                  <p className="text-sm font-medium text-text-strong">{t.label}</p>
                  <p className="mt-0.5 text-xs text-text-muted">{t.description}</p>
                </button>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
