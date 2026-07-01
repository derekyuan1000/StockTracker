import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft, BarChart2, TrendingUp } from "lucide-react";
import { PublicShell } from "@/components/PublicShell";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableNumericCell,
} from "@/components/ui/table";
import { getPublicProfile } from "@/fns/public";
import type { PublicTrade } from "@/fns/public";

export const Route = createFileRoute("/profiles/$userId")({
  component: ProfilePage,
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

function TradeRow({ trade }: { trade: PublicTrade }) {
  return (
    <TableRow>
      <TableCell>
        <BuySellChip type={trade.type} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.05em] text-text-strong">
            {trade.ticker}
          </span>
          <span className="truncate text-sm text-text-muted">{trade.name}</span>
        </div>
      </TableCell>
      <TableNumericCell>{trade.units.toFixed(3)}</TableNumericCell>
      <TableNumericCell className="text-text-muted">{trade.price.toFixed(2)}p</TableNumericCell>
      <TableNumericCell>£{trade.amountGBP.toFixed(2)}</TableNumericCell>
      <TableNumericCell className="text-text-muted">{trade.date}</TableNumericCell>
    </TableRow>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-sm border border-hairline bg-[var(--surface-card)] p-4">
      <div className="mb-2 flex items-center gap-2 text-text-muted">
        {icon}
        <span className="eyebrow">{label}</span>
      </div>
      <p className="font-mono text-xl tabular-nums text-text-strong">{value}</p>
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
        <div className="max-w-3xl pt-8">
          <div className="mb-6 h-8 w-48 animate-pulse rounded-sm bg-[var(--surface-elevated)]" />
          <div className="mb-8 grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-sm bg-[var(--surface-elevated)]" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="mb-2 h-14 animate-pulse rounded-sm bg-[var(--surface-elevated)]" />
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
          <h2 className="text-lg font-medium text-text-strong">Profile not found</h2>
          <p className="mt-1 text-sm text-text-muted">This profile is private or doesn't exist.</p>
          <Button variant="ghost-line" className="mt-6" asChild>
            <Link to="/community">
              <ArrowLeft className="size-4" /> Back to community
            </Link>
          </Button>
        </div>
      </PublicShell>
    );
  }

  const gl = profile.stats.realisedGL;
  const glUp = gl >= 0;

  return (
    <PublicShell>
      {/* Dark band profile header */}
      <div className="-mx-6 bg-[var(--canvas-dark)] px-6 text-[var(--on-dark)]">
        <div className="py-10">
          <Link
            to="/community"
            className="mb-6 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.08em] text-white/50 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" /> Community
          </Link>
          <p className="eyebrow text-white/50">Portfolio</p>
          <div className="mt-3 flex items-center gap-4">
            <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--accent-mint)] font-mono text-xl text-[var(--text-strong)]">
              {profile.displayName.charAt(0).toUpperCase()}
            </span>
            <div>
              <h1 className="text-4xl font-medium leading-[1.05] tracking-[-0.02em] text-[var(--on-dark)] md:text-5xl">
                {profile.displayName}
              </h1>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.08em] text-white/50">
                {profile.stats.tradeCount} trades · Public portfolio
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl pt-8">
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
        <h2 className="mb-3 text-xl font-medium tracking-[-0.02em] text-text-strong">
          Trade history
        </h2>
        {profile.trades.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">No trades yet.</p>
        ) : (
          <div className="rounded-sm border border-hairline">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Ticker</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profile.trades.map((t, i) => (
                  <TradeRow key={i} trade={t} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </PublicShell>
  );
}
