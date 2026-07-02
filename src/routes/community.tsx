import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { getPublicFeed, getPublicLeaderboard } from "@/fns/public";
import type { PublicTrade, LeaderboardEntry } from "@/fns/public";

export const Route = createFileRoute("/community")({
  component: CommunityPage,
});

function BuySellChip({ type }: { type: "buy" | "sell" }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] ${
        type === "buy"
          ? "bg-[color-mix(in_srgb,var(--up)_15%,transparent)] text-[var(--up)]"
          : "bg-[color-mix(in_srgb,var(--down)_15%,transparent)] text-[var(--down)]"
      }`}
    >
      {type}
    </span>
  );
}

function FeedRow({ trade }: { trade: PublicTrade }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-hairline py-3.5 last:border-0">
      <BuySellChip type={trade.type as "buy" | "sell"} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.05em] text-text-strong">
            {trade.ticker}
          </span>
          {trade.name ? (
            <>
              <span className="text-text-muted opacity-40">·</span>
              <span className="truncate text-sm text-text-muted">{trade.name}</span>
            </>
          ) : null}
        </div>
        <div className="mt-0.5 flex items-center gap-3 font-mono text-[11px] tabular-nums text-text-muted">
          <span>{trade.units.toFixed(3)} units</span>
          <span>@ {trade.price.toFixed(2)}p</span>
          <span>£{(trade.amountGBP / 100).toFixed(2)}</span>
        </div>
      </div>
      <div className="text-right">
        <span className="block text-sm font-medium text-text-body">{trade.displayName}</span>
        <span className="block font-mono text-[11px] tabular-nums text-text-muted">
          {trade.date}
        </span>
      </div>
    </div>
  );
}

type SortKey = "gl" | "return" | "1m" | "1y";

function PctCell({ value }: { value: number | null }) {
  if (value == null)
    return <span className="font-mono text-sm tabular-nums text-text-muted">—</span>;
  const up = value >= 0;
  return (
    <span
      className={`font-mono text-sm tabular-nums ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}
    >
      {up ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

const ROW_COLS = "grid-cols-[2rem_1fr_5.5rem_5.5rem_4rem_4rem]";

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  return (
    <Link
      to="/profiles/$userId"
      params={{ userId: entry.userId }}
      className={`grid ${ROW_COLS} items-center gap-4 border-b border-hairline py-3.5 last:border-0 transition-colors hover:bg-[var(--surface-elevated)]`}
    >
      <span className="text-center font-mono text-sm tabular-nums text-text-muted">{rank}</span>
      <span className="text-sm font-medium text-text-strong">{entry.displayName}</span>
      <span className="text-right font-mono text-sm tabular-nums text-text-muted">
        {entry.gainGBP >= 0 ? "+" : ""}£{Math.abs(entry.gainGBP).toFixed(0)}
      </span>
      <span className="text-right">
        <PctCell value={entry.gainPct} />
      </span>
      <span className="text-right">
        <PctCell value={entry.monthGainPct} />
      </span>
      <span className="text-right">
        <PctCell value={entry.yearGainPct} />
      </span>
    </Link>
  );
}

function FeedTab() {
  const { data: feed = [], isLoading } = useQuery({
    queryKey: ["public-feed"],
    queryFn: () => getPublicFeed({ data: { limit: 50 } }),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 animate-pulse rounded bg-[var(--surface-elevated)]" />
        ))}
      </div>
    );
  }

  if (!feed.length) {
    return (
      <div className="py-20 text-center">
        <Users className="mx-auto mb-4 size-10 text-text-muted opacity-30" />
        <h3 className="text-base font-medium text-text-strong">No public trades yet</h3>
        <p className="mt-1 text-sm text-text-muted">
          Sign in and publish your portfolio to appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="pt-2">
      {feed.map((t, i) => (
        <FeedRow key={i} trade={t} />
      ))}
    </div>
  );
}

function LeaderboardTab() {
  const [sortKey, setSortKey] = useState<SortKey>("return");

  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["public-leaderboard"],
    queryFn: () => getPublicLeaderboard(),
    staleTime: 60_000,
    refetchInterval: 300_000,
  });

  const sorted = [...leaderboard].sort((a, b) => {
    if (sortKey === "gl") return b.gainGBP - a.gainGBP;
    if (sortKey === "1m") return (b.monthGainPct ?? -Infinity) - (a.monthGainPct ?? -Infinity);
    if (sortKey === "1y") return (b.yearGainPct ?? -Infinity) - (a.yearGainPct ?? -Infinity);
    return b.gainPct - a.gainPct;
  });

  if (isLoading) {
    return (
      <div className="space-y-3 pt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 animate-pulse rounded bg-[var(--surface-elevated)]" />
        ))}
      </div>
    );
  }

  if (!leaderboard.length) {
    return (
      <div className="py-20 text-center">
        <TrendingUp className="mx-auto mb-4 size-10 text-text-muted opacity-30" />
        <h3 className="text-base font-medium text-text-strong">No public portfolios yet</h3>
        <p className="mt-1 text-sm text-text-muted">
          Publish your portfolio to appear on the leaderboard.
        </p>
      </div>
    );
  }

  const colHeader = (label: string, key: SortKey) => (
    <button
      onClick={() => setSortKey(key)}
      className={`transition-colors ${sortKey === key ? "text-text-strong" : "text-text-muted hover:text-text-body"}`}
    >
      {label}
      {sortKey === key && " ↓"}
    </button>
  );

  return (
    <div className="pt-2">
      {/* Column headers */}
      <div
        className={`mb-2 grid ${ROW_COLS} gap-4 font-mono text-[10px] uppercase tracking-[0.08em]`}
      >
        <span className="text-center text-text-muted">#</span>
        <span className="text-text-muted">Trader</span>
        <span className="text-right">{colHeader("G/L", "gl")}</span>
        <span className="text-right">{colHeader("Return", "return")}</span>
        <span className="text-right">{colHeader("1M", "1m")}</span>
        <span className="text-right">{colHeader("1Y", "1y")}</span>
      </div>

      {sorted.map((e, i) => (
        <LeaderboardRow key={i} entry={e} rank={i + 1} />
      ))}
    </div>
  );
}

function CommunityPage() {
  const [tab, setTab] = useState<"feed" | "leaderboard">("feed");

  return (
    <AppShell>
      {/* Page-header band */}
      <div className="border-b border-hairline">
        <div className="pt-10 pb-8">
          <p className="eyebrow text-text-muted">Community</p>
          <h1 className="mt-3 text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-text-strong md:text-6xl">
            Community
          </h1>
          <p className="mt-3 max-w-xl text-text-muted">
            Trades and portfolio performance from public members.
          </p>
        </div>
      </div>

      <div className="pt-6">
        {/* Tab strip */}
        <div className="flex gap-2 border-b border-hairline">
          {(["feed", "leaderboard"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-5 pr-10 transition-colors ${
                tab === t ? "text-text-strong" : "text-text-muted hover:text-text-body"
              }`}
            >
              <span className="relative inline-block font-mono text-sm font-medium uppercase tracking-[0.05em]">
                {t}
                {tab === t && (
                  <span className="absolute -bottom-2 left-0 right-0 h-0.5 bg-[var(--brand-periwinkle)]" />
                )}
              </span>
            </button>
          ))}
        </div>

        {tab === "feed" ? <FeedTab /> : <LeaderboardTab />}
      </div>
    </AppShell>
  );
}
