import { Link, useNavigate } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { type ReactNode } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { Logo } from "./Logo";
import { SiteFooter } from "./SiteFooter";
import { TickerTape } from "./TickerTape";
import { MarketStatus, ThemeToggle } from "./AppShell";
import { useTheme } from "./ThemeProvider";

function PublicNav({ onDark }: { onDark: boolean }) {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const user = session?.user;

  async function handleSignOut() {
    await authClient.signOut();
    navigate({ to: "/login" });
  }

  const link = `font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
    onDark ? "text-white/55 hover:text-white" : "text-text-muted hover:text-text-body"
  }`;

  return (
    <div className="flex items-center gap-3">
      {user ? (
        <>
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
          {user.image ? (
            <img
              src={user.image}
              alt=""
              referrerPolicy="no-referrer"
              className="size-7 rounded-full"
            />
          ) : (
            <span className="grid size-7 place-items-center rounded-full bg-[var(--accent-mint)] text-[11px] font-semibold text-[var(--text-strong)]">
              {(user.name || user.email || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <Link to="/dashboard" className={link}>
            Dashboard
          </Link>
          <button onClick={handleSignOut} className={link}>
            Sign out
          </button>
        </>
      ) : (
        <Button asChild size="sm" variant={onDark ? "mint" : "default"}>
          <Link to="/login">Sign in</Link>
        </Button>
      )}
    </div>
  );
}

export function PublicShell({
  children,
  fullBleed = false,
}: {
  children: ReactNode;
  fullBleed?: boolean;
}) {
  const { resolvedTheme } = useTheme();
  const { data: session } = useSession();
  const onDark = resolvedTheme === "dark";

  const headerClass = onDark
    ? "bg-[var(--canvas-dark)] text-[var(--on-dark)] border-b border-[var(--hairline)]"
    : "bg-[var(--canvas)] text-[var(--text-strong)] border-b border-hairline";

  const navLink = (active = false) =>
    `px-3 py-1 font-mono text-xs uppercase tracking-[0.08em] transition-colors ${
      active
        ? onDark
          ? "text-[var(--on-dark)]"
          : "text-text-strong"
        : onDark
          ? "text-white/45 hover:text-white/80"
          : "text-text-muted hover:text-text-body"
    }`;

  return (
    <div className="min-h-screen bg-canvas text-text-body">
      <header className={`sticky top-0 z-50 ${headerClass}`}>
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link to={session?.user ? "/dashboard" : "/"}>
              <Logo size={20} showWordmark onDark={onDark} />
            </Link>
            <span className={`h-5 w-px ${onDark ? "bg-white/15" : "bg-hairline"}`} />
            <nav className="flex items-center gap-1">
              <Link
                to="/"
                activeProps={{ className: navLink(true) }}
                inactiveProps={{ className: navLink(false) }}
              >
                Home
              </Link>
              <Link
                to="/community"
                activeProps={{ className: navLink(true) }}
                inactiveProps={{ className: navLink(false) }}
              >
                Community
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <MarketStatus onDark={onDark} />
            <ThemeToggle onDark={onDark} />
            <PublicNav onDark={onDark} />
          </div>
        </div>
        <TickerTape onDark={onDark} />
      </header>

      {fullBleed ? (
        <main>{children}</main>
      ) : (
        <main className="mx-auto max-w-[1200px] px-6 py-8">{children}</main>
      )}

      <SiteFooter />
    </div>
  );
}
