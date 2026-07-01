import { Link, useNavigate } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import type { ReactNode } from "react";
import { authClient, useSession } from "@/lib/auth-client";
import { Logo } from "./Logo";
import { SiteFooter } from "./SiteFooter";
import { TickerTape } from "./TickerTape";

function PublicNav() {
  const { data: session } = useSession();
  const navigate = useNavigate();
  const user = session?.user;

  async function handleSignOut() {
    await authClient.signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="flex items-center gap-3">
      {user ? (
        <>
          <Link
            to="/settings"
            aria-label="Settings"
            className="grid size-8 place-items-center rounded-md text-text-muted transition-colors hover:bg-[var(--surface-elevated)] hover:text-text-body"
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
            <span className="grid size-7 place-items-center rounded-full bg-[var(--primary)] text-[11px] font-semibold text-[#181a20]">
              {(user.name || user.email || "?").charAt(0).toUpperCase()}
            </span>
          )}
          <Link
            to="/dashboard"
            className="text-[12px] font-medium text-text-muted transition-colors hover:text-text-body"
          >
            Dashboard
          </Link>
          <button
            onClick={handleSignOut}
            className="text-[12px] font-medium text-text-muted transition-colors hover:text-text-body"
          >
            Sign out
          </button>
        </>
      ) : (
        <Link
          to="/login"
          className="inline-flex items-center justify-center rounded-md bg-[var(--primary)] px-3 py-1.5 text-[12px] font-semibold text-[#181a20] transition-colors hover:opacity-90"
        >
          Sign in
        </Link>
      )}
    </div>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas text-text-body">
      <header className="sticky top-0 z-50 border-b border-hairline bg-canvas">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link to="/">
              <Logo size={20} showWordmark />
            </Link>
            <span className="h-5 w-px bg-hairline" />
            <nav className="flex items-center gap-1">
              <Link
                to="/"
                activeProps={{ className: "text-text-strong" }}
                inactiveProps={{ className: "text-text-muted hover:text-text-body" }}
                className="px-3 py-1 text-sm font-medium transition-colors"
              >
                Home
              </Link>
              <Link
                to="/community"
                activeProps={{ className: "text-text-strong" }}
                inactiveProps={{ className: "text-text-muted hover:text-text-body" }}
                className="px-3 py-1 text-sm font-medium transition-colors"
              >
                Community
              </Link>
            </nav>
          </div>
          <PublicNav />
        </div>
        <TickerTape />
      </header>

      <main className="mx-auto max-w-[1440px] px-6 py-8">{children}</main>

      <SiteFooter />
    </div>
  );
}
