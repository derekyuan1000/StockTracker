import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, Users, ArrowRight } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { PublicShell } from "@/components/PublicShell";
import { getPublicFeed, getPublicLeaderboard } from "@/fns/public";
import type { PublicTrade, LeaderboardEntry } from "@/fns/public";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function BuySellChip({ type }: { type: "buy" | "sell" }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
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
    <div className="flex items-center gap-3 border-b border-hairline py-3 last:border-0">
      <BuySellChip type={trade.type as "buy" | "sell"} />
      <div className="min-w-0 flex-1">
        <span className="num text-sm font-semibold text-text-strong">{trade.ticker}</span>
        <span className="mx-2 text-text-muted">·</span>
        <span className="text-sm text-text-muted">{trade.name}</span>
      </div>
      <div className="text-right">
        <span className="num block text-sm text-text-body">{trade.displayName}</span>
        <span className="num block text-[11px] text-text-muted">{trade.date}</span>
      </div>
    </div>
  );
}

function LeaderboardRow({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const up = entry.gainPct >= 0;
  return (
    <div className="flex items-center gap-3 border-b border-hairline py-3 last:border-0">
      <span className="num w-5 text-center text-[11px] text-text-muted">{rank}</span>
      <div className="min-w-0 flex-1">
        <span className="text-sm font-medium text-text-strong">{entry.displayName}</span>
      </div>
      <span
        className={`num text-sm font-semibold ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}
      >
        {up ? "+" : ""}
        {entry.gainPct.toFixed(1)}%
      </span>
    </div>
  );
}

function CommunityPreview() {
  const [tab, setTab] = useState<"feed" | "leaderboard">("feed");

  const { data: feed = [], isLoading: feedLoading } = useQuery({
    queryKey: ["public-feed-preview"],
    queryFn: () => getPublicFeed({ data: { limit: 8 } }),
    staleTime: 60_000,
  });

  const { data: leaderboard = [], isLoading: lbLoading } = useQuery({
    queryKey: ["public-leaderboard-preview"],
    queryFn: () => getPublicLeaderboard(),
    staleTime: 60_000,
  });

  const isLoading = tab === "feed" ? feedLoading : lbLoading;

  return (
    <section className="mt-16">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-strong">Community</h2>
        <Link
          to="/community"
          className="flex items-center gap-1 text-sm text-[var(--primary)] transition-opacity hover:opacity-80"
        >
          View all <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Tab strip */}
      <div className="mb-4 flex gap-1 border-b border-hairline">
        {(["feed", "leaderboard"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative pb-3 pr-5 text-sm font-medium capitalize transition-colors ${
              tab === t ? "text-text-strong" : "text-text-muted hover:text-text-body"
            }`}
          >
            {t}
            {tab === t && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--primary)]" />
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-[var(--surface-elevated)]" />
          ))}
        </div>
      ) : tab === "feed" ? (
        feed.length === 0 ? (
          <div className="py-12 text-center">
            <Users className="mx-auto mb-3 size-8 text-text-muted opacity-40" />
            <p className="text-sm text-text-muted">No public trades yet.</p>
            <p className="mt-1 text-xs text-text-muted opacity-70">
              Be the first — publish your portfolio in Settings.
            </p>
          </div>
        ) : (
          <div>
            {feed.map((t, i) => (
              <FeedRow key={i} trade={t} />
            ))}
          </div>
        )
      ) : leaderboard.length === 0 ? (
        <div className="py-12 text-center">
          <TrendingUp className="mx-auto mb-3 size-8 text-text-muted opacity-40" />
          <p className="text-sm text-text-muted">No public portfolios yet.</p>
        </div>
      ) : (
        <div>
          {leaderboard.map((e, i) => (
            <LeaderboardRow key={i} entry={e} rank={i + 1} />
          ))}
        </div>
      )}
    </section>
  );
}

function Hero() {
  const { data: session } = useSession();
  const authed = Boolean(session?.user);

  return (
    <section className="pt-16 pb-8">
      <div className="max-w-2xl">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">
          Portfolio Tracker
        </p>
        <h1 className="text-4xl font-bold leading-tight tracking-tight text-text-strong md:text-5xl">
          Your portfolio,
          <br />
          your way.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-text-muted max-w-[52ch]">
          Track stocks and funds, monitor performance, and share your journey with the community.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {authed ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[#181a20] transition-colors hover:opacity-90"
            >
              Go to dashboard
            </Link>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[#181a20] transition-colors hover:opacity-90"
            >
              Get started free
            </Link>
          )}
          <Link
            to="/community"
            className="inline-flex items-center justify-center rounded-md border border-hairline bg-transparent px-5 py-2.5 text-sm font-medium text-text-body transition-colors hover:bg-[var(--surface-elevated)]"
          >
            Explore community
          </Link>
        </div>
      </div>
    </section>
  );
}

function HomePage() {
  return (
    <PublicShell>
      <Hero />

      {/* Stats strip */}
      <div className="mt-4 grid grid-cols-3 gap-4 border-y border-hairline py-6">
        {[
          { label: "Asset classes", value: "Stocks & Funds" },
          { label: "Market data", value: "Real-time" },
          { label: "Portfolio sharing", value: "Optional" },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-sm font-semibold text-text-strong">{s.value}</p>
            <p className="mt-0.5 text-[11px] text-text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <CommunityPreview />
    </PublicShell>
  );
}
