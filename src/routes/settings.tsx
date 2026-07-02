import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useTheme } from "@/components/ThemeProvider";
import { getSettings, updateSettings, type UserSettings } from "@/fns/settings";
import type { Theme } from "@/components/ThemeProvider";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function useLocalSetting<T>(key: string, defaultValue: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? (JSON.parse(stored) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });
  const set = (v: T) => {
    setValue(v);
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {}
  };
  return [value, set];
}

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
        checked ? "bg-[var(--brand-periwinkle)]" : "bg-[var(--surface-elevated)]"
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

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 border-b border-hairline py-3 last:border-0 last:pb-0 first:pt-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-text-body">{label}</p>
        {description && <p className="mt-0.5 text-xs text-text-muted">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const THEMES: { value: Theme; label: string; description: string }[] = [
  { value: "dark", label: "Dark", description: "Easy on the eyes in low light" },
  { value: "light", label: "Light", description: "Classic bright interface" },
  { value: "system", label: "System", description: "Follows your OS preference" },
];

const TICKER_SPEEDS = [
  { value: 40, label: "Slow" },
  { value: 25, label: "Normal" },
  { value: 12, label: "Fast" },
];

const DEFAULT_RANGES = ["1D", "5D", "15D", "1M", "6M", "YTD", "1Y", "All"] as const;

function SettingsPage() {
  const qc = useQueryClient();
  const { theme, setTheme } = useTheme();

  const [compactMode, setCompactMode] = useLocalSetting("st-compact", false);
  const [tickerSpeed, setTickerSpeed] = useLocalSetting("st-ticker-speed", 25);
  const [defaultRange, setDefaultRange] = useLocalSetting("st-default-range", "1Y");
  const [showSparklines, setShowSparklines] = useLocalSetting("st-sparklines", true);

  useEffect(() => {
    if (compactMode) document.documentElement.classList.add("compact");
    else document.documentElement.classList.remove("compact");
  }, [compactMode]);

  useEffect(() => {
    document.documentElement.style.setProperty("--ticker-speed", `${tickerSpeed}s`);
  }, [tickerSpeed]);

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
        <div className="max-w-4xl space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-lg bg-[var(--surface-elevated)]" />
          ))}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl">
        <h1 className="mb-6 text-2xl font-medium tracking-tight text-text-strong">Settings</h1>

        <div className="space-y-4">
          {/* Portfolio Visibility */}
          <SectionCard
            title="Portfolio visibility"
            description="When enabled, your display name and trade history will appear on the community feed and leaderboard."
          >
            <SettingRow
              label="Public portfolio"
              description="Your name and trades are visible to everyone"
            >
              <Toggle
                checked={settings.portfolioPublic}
                onChange={(v) => save({ portfolioPublic: v })}
                disabled={saving}
              />
            </SettingRow>
          </SectionCard>

          {/* Appearance */}
          <SectionCard title="Appearance" description="Choose how StockTracker looks for you.">
            <div className="mb-5 grid gap-2 sm:grid-cols-3">
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
            <div className="border-t border-hairline pt-1">
              <SettingRow
                label="Compact layout"
                description="Reduce table row padding for denser data display"
              >
                <Toggle checked={compactMode} onChange={setCompactMode} />
              </SettingRow>
              <SettingRow
                label="Show sparklines"
                description="Mini price charts in the holdings table"
              >
                <Toggle checked={showSparklines} onChange={setShowSparklines} />
              </SettingRow>
            </div>
          </SectionCard>

          {/* Dashboard */}
          <SectionCard
            title="Dashboard"
            description="Customise the default chart view and data display."
          >
            <SettingRow
              label="Default chart period"
              description="The time range shown when you first open the dashboard"
            >
              <select
                value={defaultRange}
                onChange={(e) => setDefaultRange(e.target.value)}
                className="num cursor-pointer rounded-md border border-hairline bg-[var(--surface-elevated)] px-3 py-1.5 text-sm text-text-body transition-colors hover:text-text-strong focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                {DEFAULT_RANGES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </SettingRow>
          </SectionCard>

          {/* Ticker tape */}
          <SectionCard
            title="Ticker tape"
            description="Adjust the live price ticker that scrolls across the top."
          >
            <SettingRow label="Scroll speed" description="How fast the price tape moves">
              <div className="flex gap-0.5 rounded-md border border-hairline bg-[var(--surface-elevated)] p-0.5">
                {TICKER_SPEEDS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setTickerSpeed(s.value)}
                    className={`rounded px-3 py-1 font-mono text-xs transition-colors ${
                      tickerSpeed === s.value
                        ? "bg-[var(--primary)] text-[var(--on-primary)]"
                        : "text-text-muted hover:text-text-body"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </SettingRow>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
