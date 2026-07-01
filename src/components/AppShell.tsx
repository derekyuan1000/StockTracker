import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Moon, Settings, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { Logo } from "./Logo";
import { SiteFooter } from "./SiteFooter";
import { TickerTape } from "./TickerTape";
import { useTheme } from "./ThemeProvider";

const TABS = [
  { to: "/dashboard", label: "Summary" },
  { to: "/holdings", label: "Holdings" },
  { to: "/fundamentals", label: "Fundamentals" },
  { to: "/research", label: "Research" },
  { to: "/transactions", label: "Transactions" },
  { to: "/community", label: "Community" },
] as const;

/** Toggles true once the user scrolls past `threshold` px. */
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

function MarketStatus({ onDark }: { onDark: boolean }) {
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
          className={`inline-block size-2 rounded-full ${open ? "bg-[var(--up)] dot-live" : onDark ? "bg-white/40" : "bg-text-muted"}`}
        />
        <span>{open ? "Markets open" : "Markets closed"}</span>
      </div>
      <span className="num">
        Updated {hh}:{mm} BST
      </span>
    </div>
  );
}

function ThemeToggle({ onDark }: { onDark: boolean }) {
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

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      {user.image ? (
        <img src={user.image} alt="" referrerPolicy="no-referrer" className="size-7 rounded-full" />
      ) : (
        <span className="grid size-7 place-items-center rounded-full bg-[var(--accent-mint)] text-[11px] font-semibold text-[var(--text-strong)]">
          {(user.name || user.email || "?").charAt(0).toUpperCase()}
        </span>
      )}
      <span
        className={`hidden text-sm sm:inline ${onDark ? "text-white/80" : "text-text-body"}`}
      >
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

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const scrolled = useScrolled(60);
  const onDark = !scrolled;

  const bandClass = scrolled
    ? "bg-[var(--canvas)] text-[var(--text-strong)] border-b border-[var(--hairline)]"
    : "bg-[var(--canvas-dark)] text-[var(--on-dark)] border-b border-white/10";

  return (
    <div className="min-h-screen bg-canvas text-text-body">
      {/* Sticky chrome: top bar + ticker + nav — swaps dark→light on scroll */}
      <div className={`sticky top-0 z-50 transition-colors duration-150 ${bandClass}`}>
        <header>
          <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Logo size={20} showWordmark onDark={onDark} />
              </Link>
              <span className={`h-5 w-px ${onDark ? "bg-white/15" : "bg-hairline"}`} />
              <span
                className={`eyebrow ${onDark ? "text-white/50" : "text-text-muted"}`}
              >
                My Portfolio
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MarketStatus onDark={onDark} />
              <ThemeToggle onDark={onDark} />
              <Link
                to="/settings"
                aria-label="Settings"
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
        <nav className={`h-12 border-t ${onDark ? "border-white/10" : "border-hairline"}`}>
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
                <Link key={t.to} to={t.to} className={`${base} ${tone}`}>
                  {t.label}
                  {active && (
                    <span
                      className="absolute inset-x-5 bottom-0"
                      style={{ backgroundImage: "var(--gradient-brand)", height: "2px" }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      <main className="mx-auto max-w-[1200px] px-6 py-8">{children}</main>

      <SiteFooter />
    </div>
  );
}
