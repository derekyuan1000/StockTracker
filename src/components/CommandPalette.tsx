import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Command } from "cmdk";
import {
  BarChart3,
  BookOpen,
  Home,
  LogOut,
  Moon,
  PieChart,
  Receipt,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { useTheme } from "./ThemeProvider";

type NavItem = {
  label: string;
  to: string;
  icon: React.ReactNode;
  keywords?: string[];
};

const NAV_ITEMS: NavItem[] = [
  {
    label: "Summary",
    to: "/dashboard",
    icon: <Home className="size-4" />,
    keywords: ["dashboard", "home", "portfolio"],
  },
  {
    label: "Holdings",
    to: "/holdings",
    icon: <PieChart className="size-4" />,
    keywords: ["positions", "stocks", "funds"],
  },
  {
    label: "Fundamentals",
    to: "/fundamentals",
    icon: <BookOpen className="size-4" />,
    keywords: ["research", "stock info"],
  },
  {
    label: "Transactions",
    to: "/transactions",
    icon: <Receipt className="size-4" />,
    keywords: ["trades", "history", "buys", "sells"],
  },
  {
    label: "Analysis",
    to: "/analysis",
    icon: <BarChart3 className="size-4" />,
    keywords: ["risk", "attribution", "income", "rebalance", "insights"],
  },
  {
    label: "Community",
    to: "/community",
    icon: <Users className="size-4" />,
    keywords: ["social", "picks"],
  },
  {
    label: "Cash",
    to: "/cash",
    icon: <Wallet className="size-4" />,
    keywords: ["deposits", "withdrawals", "balance"],
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  function go(to: string) {
    setOpen(false);
    navigate({ to });
  }

  async function signOut() {
    setOpen(false);
    await authClient.signOut();
    navigate({ to: "/login" });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 pt-[15vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <Command
        label="Command palette"
        className="w-full max-w-lg overflow-hidden rounded-lg border border-hairline bg-[var(--surface-card)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command.Input
          placeholder="Search pages, commands…"
          className="w-full border-b border-hairline bg-transparent px-4 py-3.5 font-mono text-sm text-text-strong placeholder:text-text-muted focus:outline-none"
          autoFocus
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="py-6 text-center font-mono text-xs text-text-muted">
            No results
          </Command.Empty>

          <Command.Group
            heading={
              <span className="px-2 font-mono text-[10px] uppercase tracking-widest text-text-muted">
                Navigation
              </span>
            }
          >
            {NAV_ITEMS.map((item) => (
              <Command.Item
                key={item.to}
                value={[item.label, ...(item.keywords ?? [])].join(" ")}
                onSelect={() => go(item.to)}
                className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-text-body transition-colors aria-selected:bg-[var(--brand-periwinkle)]/10 aria-selected:text-text-strong"
              >
                <span className="text-text-muted">{item.icon}</span>
                {item.label}
              </Command.Item>
            ))}
          </Command.Group>

          <Command.Separator className="my-1 h-px bg-hairline" />

          <Command.Group
            heading={
              <span className="px-2 font-mono text-[10px] uppercase tracking-widest text-text-muted">
                Actions
              </span>
            }
          >
            <Command.Item
              value="toggle theme dark light mode"
              onSelect={() => {
                setTheme(resolvedTheme === "dark" ? "light" : "dark");
                setOpen(false);
              }}
              className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-text-body transition-colors aria-selected:bg-[var(--brand-periwinkle)]/10 aria-selected:text-text-strong"
            >
              <span className="text-text-muted">
                {resolvedTheme === "dark" ? (
                  <Sun className="size-4" />
                ) : (
                  <Moon className="size-4" />
                )}
              </span>
              Toggle theme ({resolvedTheme === "dark" ? "switch to light" : "switch to dark"})
            </Command.Item>
            <Command.Item
              value="sign out log out"
              onSelect={signOut}
              className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-[var(--down)] transition-colors aria-selected:bg-[var(--down)]/10"
            >
              <LogOut className="size-4" />
              Sign out
            </Command.Item>
          </Command.Group>
        </Command.List>
        <div className="border-t border-hairline px-4 py-2">
          <p className="font-mono text-[10px] text-text-muted">
            <kbd className="rounded border border-hairline px-1">↑↓</kbd> navigate ·{" "}
            <kbd className="rounded border border-hairline px-1">↵</kbd> select ·{" "}
            <kbd className="rounded border border-hairline px-1">Esc</kbd> close
          </p>
        </div>
      </Command>
    </div>
  );
}
