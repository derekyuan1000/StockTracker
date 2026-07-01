import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, BarChart2, TrendingUp } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { getPublicProfile } from "@/fns/public";
import type { PublicTrade } from "@/fns/public";

export const Route = createFileRoute("/profiles/$userId")({
  component: ProfilePage,
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

function TradeRow({ trade }: { trade: PublicTrade }) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 border-b border-hairline py-3.5 last:border-0">
      <BuySellChip type={trade.type} />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="num text-sm font-semibold text-text-strong">{trade.ticker}</span>
          <span className="truncate text-sm text-text-muted">{trade.name}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-3 text-[11px] text-text-muted">
          <span className="num">{trade.units.toFixed(3)} units</span>
          <span className="num">@ {trade.price.toFixed(2)}p</span>
        </div>
      </div>
      <div className="text-right">
        <span className="num block text-sm font-medium text-text-body">
          £{trade.amountGBP.toFixed(2)}
        </span>
        <span className="num block text-[11px] text-text-muted">{trade.date}</span>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-[var(--surface-card)] p-4">
      <div className="mb-2 flex items-center gap-2 text-text-muted">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className="num text-xl font-bold text-text-strong">{value}</p>
    </div>
  );
}

function ProfilePage() {
  const { userId } = Route.useParams();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: () => getPublicProfile({ data: { userId } }),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <PublicShell>
        <div className="max-w-2xl pt-8">
          <div className="mb-6 h-8 w-48 animate-pulse rounded bg-[var(--surface-elevated)]" />
          <div className="mb-8 grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-[var(--surface-elevated)]" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mb-2 h-14 animate-pulse rounded bg-[var(--surface-elevated)]" />
          ))}
        </div>
      </PublicShell>
    );
  }

  if (!profile) {
    return (
      <PublicShell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Activity className="mb-4 size-10 text-text-muted opacity-30" />
          <h2 className="text-lg font-semibold text-text-strong">Profile not found</h2>
          <p className="mt-1 text-sm text-text-muted">This profile is private or doesn't exist.</p>
          <Link
            to="/community"
            className="mt-6 inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:opacity-80"
          >
            <ArrowLeft className="size-4" /> Back to community
          </Link>
        </div>
      </PublicShell>
    );
  }

  const gl = profile.stats.realisedGL;
  const glUp = gl >= 0;

  return (
    <PublicShell>
      <div className="max-w-2xl pt-8">
        <Link
          to="/community"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-muted transition-colors hover:text-text-body"
        >
          <ArrowLeft className="size-4" /> Community
        </Link>

        {/* Profile header */}
        <div className="mb-6 flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-full bg-[var(--primary)] text-lg font-bold text-[var(--on-primary)]">
            {profile.displayName.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="text-xl font-bold text-text-strong">{profile.displayName}</h1>
            <p className="text-sm text-text-muted">Public portfolio</p>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-8 grid grid-cols-3 gap-3">
          <StatCard
            icon={<BarChart2 className="size-4" />}
            label="Total invested"
            value={`£${profile.stats.totalInvestedGBP.toFixed(0)}`}
          />
          <StatCard
            icon={<TrendingUp className="size-4" />}
            label="Realised G/L"
            value={`${glUp ? "+" : ""}£${gl.toFixed(0)}`}
          />
          <StatCard
            icon={<Activity className="size-4" />}
            label="Trades"
            value={String(profile.stats.tradeCount)}
          />
        </div>

        {/* Trade history */}
        <h2 className="mb-3 text-base font-semibold text-text-strong">Trade history</h2>
        {profile.trades.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">No trades yet.</p>
        ) : (
          <div>
            {profile.trades.map((t, i) => (
              <TradeRow key={i} trade={t} />
            ))}
          </div>
        )}
      </div>
    </PublicShell>
  );
}
