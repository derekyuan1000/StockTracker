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

function MarketStatus() {
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
    <div className="flex items-center gap-4 text-[11px] text-text-muted">
      <div className="flex items-center gap-2">
        <span
          className={`inline-block size-2 rounded-full ${open ? "bg-[var(--up)] dot-live" : "bg-text-muted"}`}
        />
        <span>{open ? "Markets open" : "Markets closed"}</span>
      </div>
      <span className="num">
        Updated {hh}:{mm} BST
      </span>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
      className="grid size-8 place-items-center rounded-md text-text-muted transition-colors hover:bg-[var(--surface-elevated)] hover:text-text-body"
    >
      {resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function UserMenu() {
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
        <span className="grid size-7 place-items-center rounded-full bg-[var(--primary)] text-[11px] font-semibold text-[#181a20]">
          {(user.name || user.email || "?").charAt(0).toUpperCase()}
        </span>
      )}
      <span className="hidden text-sm text-text-body sm:inline">{user.name || user.email}</span>
      <button
        onClick={handleSignOut}
        className="text-[12px] font-medium text-text-muted transition-colors hover:text-text-body"
      >
        Sign out
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-canvas text-text-body">
      {/* Sticky chrome: top bar + ticker + nav all in one container */}
      <div className="sticky top-0 z-50">
        <header className="border-b border-hairline bg-canvas">
          <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Logo size={20} showWordmark />
              </Link>
              <span className="h-5 w-px bg-hairline" />
              <span className="text-sm font-semibold tracking-wide text-text-muted">
                MY PORTFOLIO
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MarketStatus />
              <ThemeToggle />
              <Link
                to="/settings"
                aria-label="Settings"
                className="grid size-8 place-items-center rounded-md text-text-muted transition-colors hover:bg-[var(--surface-elevated)] hover:text-text-body"
              >
                <Settings className="size-4" />
              </Link>
              <UserMenu />
            </div>
          </div>
          <TickerTape />
        </header>

        {/* Tab strip */}
        <nav className="h-12 border-b border-hairline bg-canvas">
          <div className="mx-auto flex h-full max-w-[1440px] items-center px-6">
            {TABS.map((t) => {
              const active =
                pathname === t.to || (t.to !== "/dashboard" && pathname.startsWith(t.to));
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`relative flex h-full items-center px-5 text-sm font-medium transition-colors ${
                    active ? "text-text-strong" : "text-text-muted hover:text-text-muted-strong"
                  }`}
                >
                  {t.label}
                  {active && (
                    <span className="absolute inset-x-3 bottom-0 h-0.5 bg-[var(--primary)]" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>

      <main className="mx-auto max-w-[1440px] px-6 py-8">{children}</main>

      <SiteFooter />
    </div>
  );
}
