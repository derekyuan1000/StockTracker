import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import { TrendingUp, Users, ArrowRight } from "lucide-react";
import { useSession } from "@/lib/auth-client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { getPublicFeed, getPublicLeaderboard } from "@/fns/public";
import type { PublicTrade, LeaderboardEntry } from "@/fns/public";

export const Route = createFileRoute("/")({
  component: HomePage,
});

// ─── Shared motion variants ───────────────────────────────────────────────────

const STAGGER = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const FADE_UP = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.2, 0, 0.2, 1] as [number, number, number, number] },
  },
};

// ─── Community preview ────────────────────────────────────────────────────────

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
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.15 }}
      variants={STAGGER}
    >
      <motion.div variants={FADE_UP} className="mb-6 flex items-end justify-between">
        <h2 className="text-3xl font-medium tracking-[-0.025em] text-text-strong">
          What people are trading
        </h2>
        <Link
          to="/community"
          className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.08em] text-text-muted transition-colors hover:text-text-body"
        >
          View all <ArrowRight className="size-3.5" />
        </Link>
      </motion.div>

      <motion.div variants={FADE_UP} className="mb-4 flex gap-2 border-b border-hairline">
        {(["feed", "leaderboard"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-4 pr-10 transition-colors ${
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
      </motion.div>

      <motion.div variants={FADE_UP}>
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
      </motion.div>
    </motion.section>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const { data: session } = useSession();
  const authed = Boolean(session?.user);

  return (
    <section className="bg-canvas">
      <div className="mx-auto max-w-[1200px] px-6 py-24 md:py-32">
        <motion.div
          className="flex flex-col items-center text-center"
          initial="hidden"
          animate="show"
          variants={STAGGER}
        >
          {/* Headline */}
          <motion.h1
            variants={FADE_UP}
            className="mx-auto max-w-3xl text-5xl font-medium leading-[1.04] tracking-[-0.03em] text-text-strong md:text-6xl lg:text-[72px]"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            Track it. <span className="text-text-muted-strong">Understand it. Own it.</span>
          </motion.h1>

          {/* Subhead */}
          <motion.p
            variants={FADE_UP}
            className="mx-auto mt-7 max-w-[44ch] text-lg leading-relaxed text-text-muted"
          >
            Real numbers, no noise. Your stocks and funds, tracked and shared.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={FADE_UP}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            {authed ? (
              <Button asChild>
                <Link to="/dashboard">Go to dashboard</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link to="/login">Get started free</Link>
              </Button>
            )}
            <Button asChild variant="ghost-line">
              <Link to="/community">Explore community</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Stats strip ──────────────────────────────────────────────────────────────

const STATS = [
  { value: "Real-time", label: "Market data" },
  { value: "Stocks & ETFs", label: "Asset classes" },
  { value: "Community", label: "Public leaderboard" },
];

function StatsStrip() {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.4 }}
      variants={STAGGER}
      className="border-t border-hairline"
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap justify-center gap-x-16 gap-y-6 px-6 py-10">
        {STATS.map((s) => (
          <motion.div key={s.label} variants={FADE_UP}>
            <p className="num text-2xl font-medium tracking-[-0.02em] text-text-strong">
              {s.value}
            </p>
            <p className="mt-0.5 text-sm text-text-muted">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function HomePage() {
  return (
    <MotionConfig reducedMotion="user">
      <AppShell fullBleed>
        <Hero />
        <StatsStrip />
        <section className="border-t border-hairline">
          <div className="mx-auto max-w-[1200px] px-6 py-16 pb-24">
            <CommunityPreview />
          </div>
        </section>
      </AppShell>
    </MotionConfig>
  );
}
