import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Moon, Settings, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "./ui/button";
import { authClient, useSession } from "@/lib/auth-client";
import { Logo } from "./Logo";
import { OnboardingTour } from "./OnboardingTour";
import { SiteFooter } from "./SiteFooter";
import { TickerTape } from "./TickerTape";
import { useTheme } from "./ThemeProvider";

const TABS = [
  { to: "/dashboard", label: "Summary" },
  { to: "/holdings", label: "Holdings" },
  { to: "/fundamentals", label: "Fundamentals" },
  { to: "/transactions", label: "Transactions" },
  { to: "/community", label: "Community" },
] as const;

const TAB_TOUR: Partial<Record<string, string>> = {
  "/holdings": "tab-holdings",
  "/fundamentals": "tab-fundamentals",
  "/community": "tab-community",
};

function useScrolled(threshold = 60) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

export function MarketStatus({ onDark }: { onDark: boolean }) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  if (!now) return null;

  const h = now.getUTCHours();
  const day = now.getUTCDay();
  const open = day >= 1 && day <= 5 && h >= 7 && h < 16;
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return (
    <div
      className={`flex items-center gap-4 text-[11px] ${
        onDark ? "text-white/55" : "text-text-muted"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className={`inline-block size-2 rounded-full ${
            open ? "bg-[var(--up)] dot-live" : onDark ? "bg-white/40" : "bg-text-muted"
          }`}
        />
        <span>{open ? "Markets open" : "Markets closed"}</span>
      </div>
      <span className="num">
        Updated {hh}:{mm} BST
      </span>
    </div>
  );
}

export function ThemeToggle({ onDark }: { onDark: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className={`grid size-8 place-items-center rounded-sm transition-colors ${
        onDark
          ? "text-white/60 hover:bg-white/10 hover:text-white"
          : "text-text-muted hover:bg-[var(--surface-elevated)] hover:text-text-body"
      }`}
    >
      {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function UserMenu({ onDark }: { onDark: boolean }) {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const user = session?.user;

  async function handleSignOut() {
    await authClient.signOut();
    navigate({ to: "/login" });
  }

  if (!user)
    return (
      <Button asChild size="sm" variant={onDark ? "mint" : "default"}>
        <Link to="/login">Sign In / Sign Up</Link>
      </Button>
    );

  return (
    <div className="flex items-center gap-3">
      {user.image ? (
        <img src={user.image} alt="" referrerPolicy="no-referrer" className="size-7 rounded-full" />
      ) : (
        <span className="grid size-7 place-items-center rounded-full bg-[var(--accent-mint)] text-[11px] font-semibold text-[var(--text-strong)]">
          {(user.name || user.email || "?").charAt(0).toUpperCase()}
        </span>
      )}
      <span className={`hidden text-sm sm:inline ${onDark ? "text-white/80" : "text-text-body"}`}>
        {user.name || user.email}
      </span>
      <button
        onClick={handleSignOut}
        className={`font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
          onDark ? "text-white/55 hover:text-white" : "text-text-muted hover:text-text-body"
        }`}
      >
        Sign out
      </button>
    </div>
  );
}

function useLocalSettingsInit() {
  useEffect(() => {
    try {
      const speed = localStorage.getItem("st-ticker-speed");
      if (speed)
        document.documentElement.style.setProperty("--ticker-speed", `${JSON.parse(speed)}s`);
      const compact = localStorage.getItem("st-compact");
      if (compact && JSON.parse(compact)) document.documentElement.classList.add("compact");
    } catch {}
  }, []);
}

export function AppShell({
  children,
  fullBleed = false,
}: {
  children: ReactNode;
  fullBleed?: boolean;
}) {
  useLocalSettingsInit();
  const { resolvedTheme } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const scrolled = useScrolled(60);
  const { data: session } = useSession();
  const [showTour, setShowTour] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    if (localStorage.getItem("st_tour_seen")) return;
    const t = setTimeout(() => {
      localStorage.setItem("st_tour_seen", "1");
      setShowTour(true);
    }, 600);
    return () => clearTimeout(t);
  }, [session?.user]);

  // Header colour tracks the active theme, not scroll position.
  // In light mode, scroll only adds a subtle shadow lift.
  const onDark = resolvedTheme === "dark";

  const headerClass = onDark
    ? "bg-[var(--canvas-dark)] text-[var(--on-dark)] border-b border-[var(--hairline)]"
    : `bg-[var(--canvas)] text-[var(--text-strong)] border-b border-hairline${
        scrolled ? " shadow-[0_1px_4px_rgba(0,0,0,0.06)]" : ""
      }`;

  return (
    <div className="min-h-screen bg-canvas text-text-body">
      <div className={`sticky top-0 z-50 transition-all duration-150 ${headerClass}`}>
        <header>
          <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
            <Link to={session?.user ? "/dashboard" : "/"}>
              <Logo size={20} showWordmark onDark={onDark} />
            </Link>
            <div className="flex items-center gap-2">
              <MarketStatus onDark={onDark} />
              <ThemeToggle onDark={onDark} />
              <Link
                to="/settings"
                aria-label="Settings"
                data-tour="settings-btn"
                className={`grid size-8 place-items-center rounded-sm transition-colors ${
                  onDark
                    ? "text-white/60 hover:bg-white/10 hover:text-white"
                    : "text-text-muted hover:bg-[var(--surface-elevated)] hover:text-text-body"
                }`}
              >
                <Settings className="size-4" />
              </Link>
              <UserMenu onDark={onDark} />
            </div>
          </div>
          <TickerTape onDark={onDark} />
        </header>

        {/* Tab strip */}
        <nav className="h-12 border-t border-[var(--hairline)]" data-tour="nav-tabs">
          <div className="mx-auto flex h-full max-w-[1200px] items-center px-6">
            {TABS.map((t) => {
              const active =
                pathname === t.to || (t.to !== "/dashboard" && pathname.startsWith(t.to));
              const base =
                "relative flex h-full items-center px-5 font-mono text-xs uppercase tracking-[0.08em] transition-colors";
              const tone = active
                ? onDark
                  ? "text-[var(--on-dark)]"
                  : "text-text-strong"
                : onDark
                  ? "text-white/45 hover:text-white/80"
                  : "text-text-muted hover:text-text-strong";
              return (
                <Link key={t.to} to={t.to} data-tour={TAB_TOUR[t.to]} className={`${base} ${tone}`}>
                  {t.label}
                  {active && (
                    <span className="absolute inset-x-5 bottom-0 h-0.5 bg-[var(--brand-periwinkle)]" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      {fullBleed ? (
        <main>{children}</main>
      ) : (
        <main className="mx-auto max-w-[1200px] px-6 py-8">{children}</main>
      )}

      <SiteFooter />
      {showTour && <OnboardingTour onDone={() => setShowTour(false)} />}
    </div>
  );
}
