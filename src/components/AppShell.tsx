import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { authClient, useSession } from "@/lib/auth-client";

const TABS = [
  { to: "/", label: "Summary" },
  { to: "/holdings", label: "Holdings" },
  { to: "/fundamentals", label: "Fundamentals" },
  { to: "/research", label: "Research" },
  { to: "/transactions", label: "Transactions" },
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
        <span className="grid size-7 place-items-center rounded-full bg-[var(--primary)] text-[11px] font-semibold text-primary-foreground">
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
      {/* Top bar */}
      <header className="sticky top-0 z-50 h-14 border-b border-hairline bg-canvas">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="inline-block size-3 rounded-sm bg-[var(--primary)]" />
              <span className="text-sm font-bold tracking-tight text-[var(--primary)]">
                StockTracker
              </span>
            </div>
            <span className="h-5 w-px bg-hairline" />
            <span className="text-sm font-semibold tracking-wide text-text-body">MY PORTFOLIO</span>
          </div>
          <div className="flex items-center gap-4">
            <MarketStatus />
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Tab strip */}
      <nav className="sticky top-14 z-40 h-12 border-b border-hairline bg-canvas">
        <div className="mx-auto flex h-full max-w-[1440px] items-center px-6">
          {TABS.map((t) => {
            const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
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

      <main className="mx-auto max-w-[1440px] px-6 py-8">{children}</main>

      <footer className="mx-auto mt-12 max-w-[1440px] border-t border-hairline px-6 py-6 text-[11px] text-text-muted">
        Prices delayed up to 15 min. Demonstration data. Not investment advice.
      </footer>
    </div>
  );
}
