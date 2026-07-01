import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, Users } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
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
          <span className="text-sm text-text-muted">{trade.name}</span>
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

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const up = entry.gainPct >= 0;
  return (
    <Link
      to="/profiles/$userId"
      params={{ userId: entry.userId }}
      className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-4 border-b border-hairline py-3.5 last:border-0 transition-colors hover:bg-[var(--surface-elevated)]"
    >
      <span className="text-center font-mono text-sm tabular-nums text-[var(--text-muted)]">
        {rank}
      </span>
      <span className="text-sm font-medium text-text-strong">{entry.displayName}</span>
      <span className="font-mono text-sm tabular-nums text-text-muted">
        {entry.gainGBP >= 0 ? "+" : ""}£{Math.abs(entry.gainGBP).toFixed(0)}
      </span>
      <span
        className={`font-mono text-sm tabular-nums ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}
      >
        {up ? "+" : ""}
        {entry.gainPct.toFixed(1)}%
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
  const { data: leaderboard = [], isLoading } = useQuery({
    queryKey: ["public-leaderboard"],
    queryFn: () => getPublicLeaderboard(),
    staleTime: 60_000,
    refetchInterval: 300_000,
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

  return (
    <div className="pt-2">
      <div className="mb-2 grid grid-cols-[2rem_1fr_auto_auto] gap-4 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted">
        <span className="text-center">#</span>
        <span>Trader</span>
        <span>G/L</span>
        <span>Return</span>
      </div>
      {leaderboard.map((e, i) => (
        <LeaderboardRow key={i} entry={e} rank={i + 1} />
      ))}
    </div>
  );
}

function CommunityPage() {
  const [tab, setTab] = useState<"feed" | "leaderboard">("feed");

  return (
    <PublicShell>
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
        {/* Tab strip — mono-caps + gradient underline */}
        <div className="flex gap-1 border-b border-hairline">
          {(["feed", "leaderboard"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative pb-3 pr-6 font-mono text-xs uppercase tracking-[0.08em] transition-colors ${
                tab === t ? "text-text-strong" : "text-text-muted hover:text-text-body"
              }`}
            >
              {t}
              {tab === t && (
                <span
                  className="absolute inset-x-0 bottom-0"
                  style={{ backgroundImage: "var(--gradient-brand)", height: "2px" }}
                />
              )}
            </button>
          ))}
        </div>

        {tab === "feed" ? <FeedTab /> : <LeaderboardTab />}
      </div>
    </PublicShell>
  );
}
