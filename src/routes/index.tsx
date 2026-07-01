import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { TrendingUp, Users, ArrowRight } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { PublicShell } from "@/components/PublicShell";
import { Button } from "@/components/ui/button";
import { getPublicFeed, getPublicLeaderboard } from "@/fns/public";
import type { PublicTrade, LeaderboardEntry } from "@/fns/public";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function BuySellChip({ type }: { type: "buy" | "sell" }) {
  return (
    <span
      className={`inline-flex items-center rounded-xs px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${
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
    <section>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="eyebrow text-text-muted">Live from the community</p>
          <h2 className="mt-2 text-3xl font-medium tracking-[-0.02em] text-text-strong">
            What people are trading
          </h2>
        </div>
        <Link
          to="/community"
          className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.08em] text-text-body transition-opacity hover:opacity-70"
        >
          View all <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* Tab strip — gradient underline */}
      <div className="mb-4 flex gap-1 border-b border-hairline">
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

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-sm bg-[var(--surface-elevated)]" />
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

function BrandRibbon() {
  return (
    <svg
      viewBox="0 0 600 500"
      className="pointer-events-none absolute right-0 top-0 h-full w-[45%] opacity-90"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff7a45" />
          <stop offset="48%" stopColor="#e5484d" />
          <stop offset="100%" stopColor="#8b8bff" />
        </linearGradient>
      </defs>
      <path
        d="M 50 400 Q 300 100 580 200 Q 400 350 580 480 Q 300 380 50 480 Z"
        fill="url(#brandGrad)"
        opacity="0.5"
      />
      <ellipse
        cx="400"
        cy="200"
        rx="280"
        ry="180"
        fill="url(#brandGrad)"
        opacity="0.3"
        transform="rotate(-20 400 200)"
      />
      <ellipse
        cx="300"
        cy="320"
        rx="200"
        ry="120"
        fill="url(#brandGrad)"
        opacity="0.3"
        transform="rotate(15 300 320)"
      />
    </svg>
  );
}

function Hero() {
  const { data: session } = useSession();
  const authed = Boolean(session?.user);

  return (
    <section className="relative overflow-hidden bg-[var(--canvas-dark)] text-[var(--on-dark)]">
      <BrandRibbon />
      <div className="relative mx-auto flex min-h-[80vh] max-w-[1200px] items-center px-6 py-20">
        <div className="w-full md:w-[55%]">
          <p className="eyebrow text-white/50">Your portfolio, elevated</p>
          <h1 className="mt-5 text-5xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--on-dark)] md:text-7xl">
            Track it.
            <br />
            Understand it.
            <br />
            Own it.
          </h1>
          <p className="mt-6 max-w-[46ch] text-lg font-light text-white/60">
            A calm, editorial home for your stocks and funds — real-time performance, honest numbers,
            and a community that shares its work.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            {authed ? (
              <Button asChild className="ring-1 ring-white/15">
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            ) : (
              <Button asChild className="ring-1 ring-white/15">
                <Link to="/login">Get started free</Link>
              </Button>
            )}
            <Button asChild variant="mint">
              <Link to="/community">Explore community</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

const STATS = [
  { value: "10,000+", label: "Portfolios tracked" },
  { value: "Real-time", label: "Market data" },
  { value: "Stocks & Funds", label: "Asset classes" },
];

function StatsBand() {
  return (
    <section className="bg-[var(--canvas)]">
      <div className="mx-auto max-w-[1200px] px-6 py-20">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-sm border border-hairline bg-[var(--surface-card)] p-8"
            >
              <p className="num text-4xl font-medium tracking-[-0.02em] text-text-strong">
                {s.value}
              </p>
              <p className="eyebrow mt-3 text-text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomePage() {
  return (
    <PublicShell fullBleed>
      <Hero />
      <StatsBand />

      <section className="bg-[var(--canvas)]">
        <div className="mx-auto max-w-[1200px] px-6 pb-24">
          <CommunityPreview />
        </div>
      </section>
    </PublicShell>
  );
}
