import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Home,
  Menu,
  Moon,
  PieChart,
  Receipt,
  Settings,
  Sun,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "./ui/button";
import { authClient, useSession } from "@/lib/auth-client";
import { Logo } from "./Logo";
import { OnboardingTour } from "./OnboardingTour";
import { SiteFooter } from "./SiteFooter";
import { TickerTape } from "./TickerTape";
import { useTheme } from "./ThemeProvider";
import { CommandPalette } from "./CommandPalette";

type NavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  tourId?: string;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Summary", icon: <Home className="size-4" /> },
  {
    to: "/holdings",
    label: "Holdings",
    icon: <PieChart className="size-4" />,
    tourId: "tab-holdings",
  },
  {
    to: "/fundamentals",
    label: "Fundamentals",
    icon: <BookOpen className="size-4" />,
    tourId: "tab-fundamentals",
  },
  { to: "/analysis", label: "Analysis", icon: <BarChart3 className="size-4" /> },
  { to: "/transactions", label: "Transactions", icon: <Receipt className="size-4" /> },
  {
    to: "/community",
    label: "Community",
    icon: <Users className="size-4" />,
    tourId: "tab-community",
  },
  { to: "/cash", label: "Cash", icon: <Wallet className="size-4" /> },
];

const BOTTOM_PRIMARY = NAV_ITEMS.slice(0, 4);
const BOTTOM_MORE = NAV_ITEMS.slice(4);

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

function useSidebarCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("st-sidebar-collapsed") ?? "false");
    } catch {
      return false;
    }
  });
  function toggle() {
    setCollapsed((v: boolean) => {
      const next = !v;
      localStorage.setItem("st-sidebar-collapsed", JSON.stringify(next));
      return next;
    });
  }
  return [collapsed, toggle] as const;
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
      className={`flex items-center gap-4 text-[11px] ${onDark ? "text-white/55" : "text-text-muted"}`}
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

function SidebarNav({ collapsed }: { collapsed: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="flex flex-col gap-0.5 px-2 py-3">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
        return (
          <Link
            key={item.to}
            to={item.to}
            data-tour={item.tourId}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors ${
              active
                ? "bg-[var(--brand-periwinkle)]/12 text-text-strong"
                : "text-text-muted hover:bg-[var(--surface-elevated)] hover:text-text-body"
            }`}
          >
            <span className={`shrink-0 ${active ? "text-[var(--brand-periwinkle)]" : ""}`}>
              {item.icon}
            </span>
            {!collapsed && (
              <span className="truncate font-mono text-[11px] uppercase tracking-[0.08em]">
                {item.label}
              </span>
            )}
            {active && !collapsed && (
              <span className="ml-auto size-1.5 shrink-0 rounded-full bg-[var(--brand-periwinkle)]" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-hairline bg-[var(--canvas)] md:hidden">
        <div className="flex h-16 items-stretch">
          {BOTTOM_PRIMARY.map((item) => {
            const active =
              pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-1 flex-col items-center justify-center gap-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                  active ? "text-[var(--brand-periwinkle)]" : "text-text-muted hover:text-text-body"
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-1 font-mono text-[10px] uppercase tracking-wider text-text-muted hover:text-text-body"
          >
            <Menu className="size-4" />
            <span>More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-xl border-t border-hairline bg-[var(--canvas)] pb-8 pt-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between px-5">
              <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">More</p>
              <button onClick={() => setMoreOpen(false)} className="text-text-muted">
                <X className="size-4" />
              </button>
            </div>
            <div className="space-y-1 px-3">
              {BOTTOM_MORE.map((item) => {
                const active =
                  pathname === item.to ||
                  (item.to !== "/dashboard" && pathname.startsWith(item.to));
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={`flex items-center gap-3 rounded-md px-3 py-3 font-mono text-[11px] uppercase tracking-[0.08em] ${
                      active
                        ? "bg-[var(--brand-periwinkle)]/10 text-[var(--brand-periwinkle)]"
                        : "text-text-body"
                    }`}
                  >
                    {item.icon}
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
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
  const scrolled = useScrolled(60);
  const { data: session } = useSession();
  const [showTour, setShowTour] = useState(false);
  const [collapsed, toggleCollapsed] = useSidebarCollapsed();

  useEffect(() => {
    if (!session?.user) return;
    if (localStorage.getItem("st_tour_seen")) return;
    const t = setTimeout(() => {
      localStorage.setItem("st_tour_seen", "1");
      setShowTour(true);
    }, 600);
    return () => clearTimeout(t);
  }, [session?.user]);

  const onDark = resolvedTheme === "dark";
  const headerClass = onDark
    ? "bg-[var(--canvas-dark)] text-[var(--on-dark)] border-b border-[var(--hairline)]"
    : `bg-[var(--canvas)] text-[var(--text-strong)] border-b border-hairline${scrolled ? " shadow-[0_1px_4px_rgba(0,0,0,0.06)]" : ""}`;

  const sidebarWidth = collapsed ? "w-[56px]" : "w-[220px]";

  return (
    <div className="min-h-screen bg-canvas text-text-body">
      <div className={`sticky top-0 z-50 transition-all duration-150 ${headerClass}`}>
        <header>
          <div className="flex h-14 items-center justify-between px-4 md:px-6">
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
      </div>

      <div className="flex min-h-[calc(100vh-112px)]">
        {/* Desktop sidebar */}
        <aside
          className={`hidden md:flex ${sidebarWidth} shrink-0 flex-col border-r border-hairline bg-[var(--canvas)] transition-[width] duration-200`}
        >
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <SidebarNav collapsed={collapsed} />
          </div>
          <div className="border-t border-hairline p-2">
            <button
              onClick={toggleCollapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex w-full items-center justify-center rounded-md p-2 text-text-muted transition-colors hover:bg-[var(--surface-elevated)] hover:text-text-body"
            >
              {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="size-4" />}
            </button>
          </div>
        </aside>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {fullBleed ? (
            <main className="flex-1 pb-16 md:pb-0">{children}</main>
          ) : (
            <main className="flex-1 px-4 py-6 pb-20 md:px-8 md:py-8 md:pb-8 lg:px-12">
              {children}
            </main>
          )}
          <SiteFooter />
        </div>
      </div>

      <MobileBottomNav />
      <CommandPalette />
      {showTour && <OnboardingTour onDone={() => setShowTour(false)} />}
    </div>
  );
}
