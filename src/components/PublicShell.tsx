import { Link, useNavigate } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { Button } from "./ui/button";
import { Logo } from "./Logo";
import { SiteFooter } from "./SiteFooter";
import { TickerTape } from "./TickerTape";

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
        <Button
          asChild
          size="sm"
          variant={onDark ? "mint" : "default"}
        >
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
  const scrolled = useScrolled(60);
  const onDark = !scrolled;

  const bandClass = scrolled
    ? "bg-[var(--canvas)] text-[var(--text-strong)] border-b border-[var(--hairline)]"
    : "bg-[var(--canvas-dark)] text-[var(--on-dark)] border-b border-white/10";

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
      <header className={`sticky top-0 z-50 transition-colors duration-150 ${bandClass}`}>
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link to="/">
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
          <PublicNav onDark={onDark} />
        </div>
        <TickerTape />
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
