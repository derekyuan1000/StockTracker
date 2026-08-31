import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, type ComponentProps, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ArrowLeft } from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PublicShell } from "@/components/PublicShell";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableNumericCell,
  TableRow,
} from "@/components/ui/table";
import { ChartSkeleton } from "@/components/Skeletons";
import {
  getPublicPortfolio,
  getPublicPortfolioHistory,
  getPublicPortfolioReturns,
  getPublicProfile,
  type PeriodReturn,
  type PublicTrade,
} from "@/fns/public";
import { compute, type Bucket } from "@stocktracker/shared";
import { dirClass, fmtGBP, fmtGBPSigned, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/profiles/$userId")({
  component: ProfilePage,
});

// ─── Types ───────────────────────────────────────────────────────────────────

type Tab = "overview" | "holdings" | "trades";
const RANGES = ["1D", "5D", "1M", "6M", "YTD", "1Y", "All"] as const;
type Range = (typeof RANGES)[number];
const PERF_PERIODS = ["1W", "1M", "6M", "1Y", "3Y"] as const;

// ─── Chart palette ───────────────────────────────────────────────────────────

const SECTOR_COLORS: Record<string, string> = {
  Fund: "#bdbbff",
  ETF: "#a78bfa",
  MUTUALFUND: "#a78bfa",
  Bond: "#fc4c02",
  Technology: "#f472b6",
  Tech: "#f472b6",
  Banking: "#22d3ee",
  Defence: "#818cf8",
  Consumer: "#f87171",
  Industrial: "#60a5fa",
  "Financial Services": "#22d3ee",
  Healthcare: "#4ade80",
  Energy: "#fb923c",
  "Real Estate": "#a3e635",
  Utilities: "#67e8f9",
  "Communication Services": "#c084fc",
  "Consumer Discretionary": "#f87171",
  "Consumer Staples": "#fda4af",
  Materials: "#86efac",
  Other: "#94a3b8",
};

const STOCK_PALETTE = [
  "#bdbbff",
  "#60a5fa",
  "#34d399",
  "#fc4c02",
  "#a78bfa",
  "#fb923c",
  "#22d3ee",
  "#4ade80",
  "#f87171",
  "#818cf8",
  "#ef2cc1",
  "#38bdf8",
  "#86efac",
  "#c084fc",
  "#67e8f9",
];

const CHART_TICK = { fill: "var(--text-muted)", fontSize: 11, fontFamily: "JetBrains Mono" };
const CHART_GRID = "var(--hairline)";
const CHART_TOOLTIP_STYLE: React.CSSProperties = {
  background: "var(--surface-card)",
  border: "1px solid var(--hairline)",
  borderRadius: 4,
  fontSize: 13,
  fontFamily: "JetBrains Mono",
  boxShadow: "none",
};
const CHART_TOOLTIP_LABEL: React.CSSProperties = { color: "var(--text-strong)", fontSize: 11 };
const CHART_TOOLTIP_ITEM: React.CSSProperties = { color: "var(--text-body)" };
const CHART_UP = "var(--up)";
const CHART_DOWN = "var(--down)";

// ─── Helper components ───────────────────────────────────────────────────────

function KpiRow({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: number;
}) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-text-muted">{label}</div>
      <div
        className={`num mt-1 text-base font-semibold ${tone === undefined ? "text-text-body" : dirClass(tone)}`}
      >
        {value}
      </div>
      {sub && (
        <div
          className={`num text-[11px] ${tone === undefined ? "text-text-muted" : dirClass(tone)}`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function PeriodReturnTile({
  period,
  data,
  loading,
}: {
  period: string;
  data?: PeriodReturn;
  loading: boolean;
}) {
  const shell = "flex items-baseline justify-between gap-3 bg-surface px-6 py-4 sm:block sm:py-5";
  if (loading) {
    return (
      <div className={shell}>
        <div className="eyebrow text-text-muted">{period}</div>
        <div className="sm:mt-2">
          <div className="h-[22px] w-20 animate-pulse rounded bg-[var(--surface-elevated)]" />
          <div className="mt-1.5 h-3 w-16 animate-pulse rounded bg-[var(--surface-elevated)]" />
        </div>
      </div>
    );
  }
  const unavailable = !data || data.covered === 0;
  const partial = !unavailable && data.covered < data.total;
  return (
    <div
      className={shell}
      title={unavailable ? `Not enough price history for ${period}` : undefined}
    >
      <div className="eyebrow text-text-muted">{period}</div>
      <div className="text-right sm:mt-2 sm:text-left">
        <div
          className={`num text-xl font-medium leading-none ${unavailable ? "text-text-muted" : dirClass(data.pct)}`}
        >
          {unavailable ? "—" : fmtPct(data.pct)}
        </div>
        <div
          className={`num mt-1.5 text-xs ${unavailable ? "text-text-muted" : dirClass(data.gbp)}`}
        >
          {unavailable ? "—" : fmtGBPSigned(data.gbp)}
        </div>
        {partial && (
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-muted">
            {data.covered}/{data.total} holdings
          </div>
        )}
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-sm border border-hairline bg-surface p-5">
      <div className="mb-3">
        <p className="eyebrow text-text-muted">{title}</p>
        {subtitle && <p className="mt-1 text-[11px] text-text-muted opacity-70">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

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

// ─── ProfilePage ─────────────────────────────────────────────────────────────

function ProfilePage() {
  const { userId } = Route.useParams();
  const { resolvedTheme } = useTheme();
  const onDark = resolvedTheme === "dark";
  const [tab, setTab] = useState<Tab>("overview");
  const [range, setRange] = useState<Range>("1Y");

  // ── Queries ────────────────────────────────────────────────────────────────

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["public-profile", userId],
    queryFn: () => getPublicProfile({ data: { userId } }),
    staleTime: 60_000,
  });

  const { data: portfolio } = useQuery({
    queryKey: ["public-portfolio", userId],
    queryFn: () => getPublicPortfolio({ data: { userId } }),
    enabled: !!profile,
    staleTime: 60_000,
  });

  const { data: history = [], isFetching: histFetching } = useQuery({
    queryKey: ["public-portfolio-history", userId, range],
    queryFn: () => getPublicPortfolioHistory({ data: { userId, range } }),
    enabled: !!portfolio && portfolio.holdings.length > 0,
    staleTime: 60_000,
  });

  const { data: periodReturns = [], isFetching: returnsFetching } = useQuery({
    queryKey: ["public-portfolio-returns", userId],
    queryFn: () => getPublicPortfolioReturns({ data: { userId } }),
    enabled: !!portfolio && portfolio.holdings.length > 0,
    staleTime: 5 * 60_000,
  });

  // ── Derived values ─────────────────────────────────────────────────────────

  const holdingsList = portfolio?.holdings ?? [];
  const cashGBP = portfolio?.cashGBP ?? 0;
  const realisedGL = portfolio?.realisedGL ?? 0;
  const p = useMemo(() => compute(holdingsList, cashGBP), [holdingsList, cashGBP]);

  const sectorData = useMemo(() => {
    const groups = new Map<string, number>();
    p.rows.forEach((r) => {
      const key = r.bucket === "Fund" ? "Fund" : r.sector || "Other";
      groups.set(key, (groups.get(key) ?? 0) + r.marketValueGBP);
    });
    return Array.from(groups, ([name, value]) => ({
      name,
      value,
      color: SECTOR_COLORS[name] ?? "#929aa5",
    }));
  }, [p.rows]);

  const stockData = useMemo(
    () =>
      p.rows.map((r, i) => ({
        ticker: r.ticker.replace(".L", ""),
        name: r.name,
        value: +r.marketValueGBP.toFixed(2),
        color: STOCK_PALETTE[i % STOCK_PALETTE.length],
      })),
    [p.rows],
  );

  const moversData = useMemo(
    () =>
      [...p.rows]
        .sort((a, b) => a.dayChangePct - b.dayChangePct)
        .map((r) => ({ name: r.name, pct: +r.dayChangePct.toFixed(2) })),
    [p.rows],
  );

  const ytdMoversData = useMemo(
    () =>
      [...p.rows]
        .sort((a, b) => (a.ytdPct ?? 0) - (b.ytdPct ?? 0))
        .map((r) => ({ name: r.name, pct: +(r.ytdPct ?? 0).toFixed(2) })),
    [p.rows],
  );

  const grouped = useMemo(() => {
    const order: Bucket[] = ["Fund", "Stock"];
    return order
      .map((b) => ({ bucket: b, rows: p.rows.filter((r) => r.bucket === b) }))
      .filter((g) => g.rows.length);
  }, [p.rows]);

  const lastValue = history.at(-1)?.value ?? 0;
  const costBasis = p.cost + cashGBP;
  const gainPct = costBasis > 0 ? (lastValue / costBasis - 1) * 100 : 0;

  // ── Loading ────────────────────────────────────────────────────────────────

  if (profileLoading) {
    return (
      <PublicShell>
        <div className="py-24 text-center">
          <div className="mx-auto mb-4 h-8 w-48 animate-pulse rounded bg-[var(--surface-elevated)]" />
          <div className="mx-auto h-4 w-32 animate-pulse rounded bg-[var(--surface-elevated)]" />
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <PublicShell>
      {/* Profile header */}
      <div
        className={`-mx-6 px-6 py-10 ${onDark ? "bg-[var(--canvas-dark)] text-[var(--on-dark)]" : "bg-canvas text-text-strong"}`}
      >
        <Link
          to="/community"
          className={`mb-6 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.08em] transition-colors ${onDark ? "text-white/50 hover:text-white" : "text-text-muted hover:text-text-body"}`}
        >
          <ArrowLeft className="size-4" /> Community
        </Link>
        <p className={`eyebrow ${onDark ? "text-white/50" : "text-text-muted"}`}>Portfolio</p>
        <div className="mt-3 flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-[var(--accent-mint)] font-mono text-xl text-[var(--canvas-dark)]">
            {profile.displayName.charAt(0).toUpperCase()}
          </span>
          <div>
            <h1 className="text-4xl font-medium leading-[1.05] tracking-[-0.02em] md:text-5xl">
              {profile.displayName}
            </h1>
            <p
              className={`mt-1 font-mono text-xs uppercase tracking-[0.08em] ${onDark ? "text-white/50" : "text-text-muted"}`}
            >
              {holdingsList.length} positions · {profile.stats.tradeCount} trades · Public portfolio
            </p>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="mt-6 flex gap-0.5 rounded-sm bg-[var(--surface-elevated)] p-1 w-fit">
        {(["overview", "holdings", "trades"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-xs px-4 py-1.5 font-mono text-xs uppercase tracking-[0.08em] transition-colors ${
              tab === t
                ? "bg-[var(--primary)] text-[var(--on-primary)]"
                : "text-text-muted hover:text-text-body"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Overview tab ─────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="mt-6">
          {/* KPI + performance chart */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            {/* KPI card */}
            <div className="rounded-sm border border-hairline bg-surface p-6">
              <div className="eyebrow text-text-muted">Total portfolio value</div>
              <div className="num mt-2 text-[40px] font-medium leading-none text-text-strong">
                {fmtGBP(p.totalValue)}
              </div>
              {holdingsList.length === 0 && portfolio && (
                <div className="mt-1 text-xs text-text-muted">No holdings</div>
              )}
              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-hairline pt-5">
                <KpiRow label="Market value" value={fmtGBP(p.marketValue)} />
                <KpiRow label="Cost basis" value={fmtGBP(costBasis)} />
                <KpiRow
                  label="Day change"
                  value={fmtGBPSigned(p.dayChangeGBP)}
                  sub={fmtPct(p.dayChangePct)}
                  tone={p.dayChangeGBP}
                />
                <KpiRow
                  label="Unrealised G/L"
                  value={fmtGBPSigned(p.unrealisedGL)}
                  sub={fmtPct(p.unrealisedPct)}
                  tone={p.unrealisedGL}
                />
                <KpiRow label="Realised G/L" value={fmtGBPSigned(realisedGL)} tone={realisedGL} />
                <KpiRow label="Positions" value={String(holdingsList.length)} />
              </div>
            </div>

            {/* Performance chart */}
            <div className="rounded-sm border border-hairline bg-surface p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="eyebrow text-text-muted">Performance</div>
                  <div className="mt-1 flex items-baseline gap-3">
                    <div className="num text-2xl font-semibold text-text-strong">
                      {histFetching && history.length === 0 ? (
                        <span className="inline-block h-7 w-28 animate-pulse rounded bg-[var(--surface-elevated)] align-middle" />
                      ) : (
                        fmtGBP(lastValue)
                      )}
                    </div>
                    {(!histFetching || history.length > 0) && (
                      <div className={`num text-sm font-medium ${dirClass(gainPct)}`}>
                        {fmtPct(gainPct)} vs cost
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-0.5 rounded-sm bg-[var(--surface-elevated)] p-1 self-end sm:self-auto">
                  {RANGES.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={`rounded-xs px-2 py-1 font-mono text-xs uppercase tracking-[0.04em] tabular-nums text-center transition-colors ${
                        range === r
                          ? "bg-[var(--primary)] text-[var(--on-primary)]"
                          : "text-text-muted hover:text-text-body"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative mt-4 h-[280px]">
                {histFetching && history.length === 0 && (
                  <div className="absolute inset-0 z-10">
                    <ChartSkeleton height={280} />
                  </div>
                )}
                {!histFetching && history.length === 0 && holdingsList.length > 0 && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-canvas/80 backdrop-blur-sm">
                    <p className="text-sm font-medium text-text-muted">
                      No data available for this range
                    </p>
                    <p className="text-xs text-text-muted opacity-60">Try a longer time period</p>
                  </div>
                )}
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={history} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pubPerfGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#bdbbff" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="#bdbbff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="ts"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(t) => {
                        const d = new Date(t);
                        if (range === "1D" || range === "5D")
                          return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                        return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
                      }}
                      tick={CHART_TICK}
                      axisLine={{ stroke: CHART_GRID }}
                      tickLine={false}
                      minTickGap={48}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tickFormatter={(v) => `£${(v / 1000).toFixed(1)}k`}
                      tick={CHART_TICK}
                      axisLine={false}
                      tickLine={false}
                      width={56}
                    />
                    <Tooltip
                      cursor={{
                        stroke: "var(--brand-periwinkle)",
                        strokeWidth: 1,
                        strokeDasharray: "3 3",
                      }}
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_TOOLTIP_LABEL}
                      itemStyle={CHART_TOOLTIP_ITEM}
                      labelFormatter={(t) => new Date(t as number).toLocaleString("en-GB")}
                      formatter={(v: number) => [fmtGBP(v), "Portfolio"]}
                    />
                    {costBasis > 0 && (
                      <ReferenceLine
                        y={costBasis}
                        stroke="var(--down)"
                        strokeDasharray="4 4"
                        label={{
                          value: `Cost £${(costBasis / 1000).toFixed(1)}k`,
                          fill: "var(--down)",
                          fontSize: 10,
                          position: "insideTopLeft",
                        }}
                      />
                    )}
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#bdbbff"
                      strokeWidth={2}
                      fill="url(#pubPerfGrad)"
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          {/* Returns by period */}
          <section className="mt-8 overflow-hidden rounded-sm border border-hairline bg-surface">
            <div className="border-b border-hairline px-6 py-4">
              <p className="eyebrow text-text-muted">Performance</p>
              <h2 className="mt-1 text-base font-medium tracking-[-0.01em] text-text-strong">
                Returns by period
              </h2>
              <p className="mt-1 text-xs text-text-muted">
                Market return of current holdings over each trailing window. Excludes cash.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-px bg-[var(--hairline)] sm:grid-cols-5">
              {PERF_PERIODS.map((period) => (
                <PeriodReturnTile
                  key={period}
                  period={period}
                  data={periodReturns.find((r) => r.period === period)}
                  loading={returnsFetching && periodReturns.length === 0}
                />
              ))}
            </div>
          </section>

          {/* Chart grid */}
          <section className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card title="Sector breakdown" subtitle="By market value">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sectorData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={42}
                      outerRadius={78}
                      paddingAngle={1}
                      stroke="var(--surface-card)"
                      strokeWidth={2}
                      activeShape={(props: object) => (
                        <Sector {...(props as ComponentProps<typeof Sector>)} />
                      )}
                    >
                      {sectorData.map((s) => (
                        <Cell key={s.name} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      itemStyle={CHART_TOOLTIP_ITEM}
                      labelStyle={CHART_TOOLTIP_LABEL}
                      formatter={(v: number, _n, item) => [fmtGBP(v), item?.payload?.name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                {sectorData.map((s) => (
                  <li key={s.name} className="flex items-center gap-2 truncate">
                    <span className="size-2 rounded-sm shrink-0" style={{ background: s.color }} />
                    <span className="truncate text-text-muted">{s.name}</span>
                    <span className="num ml-auto text-text-body">
                      {p.marketValue > 0 ? ((s.value / p.marketValue) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Stock breakdown" subtitle="Market value per holding">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stockData}
                      dataKey="value"
                      nameKey="ticker"
                      innerRadius={42}
                      outerRadius={78}
                      paddingAngle={1}
                      stroke="var(--surface-card)"
                      strokeWidth={2}
                      activeShape={(props: object) => (
                        <Sector {...(props as ComponentProps<typeof Sector>)} />
                      )}
                    >
                      {stockData.map((s) => (
                        <Cell key={s.ticker} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      itemStyle={CHART_TOOLTIP_ITEM}
                      labelStyle={CHART_TOOLTIP_LABEL}
                      formatter={(v: number, _n, item) => [fmtGBP(v), item?.payload?.name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                {stockData.map((s) => (
                  <li key={s.ticker} className="flex items-center gap-2 truncate">
                    <span className="size-2 shrink-0 rounded-sm" style={{ background: s.color }} />
                    <span className="truncate text-text-muted">{s.name}</span>
                    <span className="num ml-auto text-text-body">
                      {p.marketValue > 0 ? ((s.value / p.marketValue) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card title="Top movers (Day)" subtitle="Day change %">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={moversData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 12, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={110}
                      tick={CHART_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      itemStyle={CHART_TOOLTIP_ITEM}
                      labelStyle={CHART_TOOLTIP_LABEL}
                      formatter={(v: number) => [`${v >= 0 ? "+" : ""}${v.toFixed(2)}%`, "Day"]}
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    />
                    <ReferenceLine x={0} stroke={CHART_GRID} />
                    <Bar dataKey="pct">
                      {moversData.map((m) => (
                        <Cell key={m.name} fill={m.pct >= 0 ? CHART_UP : CHART_DOWN} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card title="Top movers (YTD)" subtitle="Year to date (%)">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ytdMoversData}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 12, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={110}
                      tick={CHART_TICK}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      itemStyle={CHART_TOOLTIP_ITEM}
                      labelStyle={CHART_TOOLTIP_LABEL}
                      formatter={(v: number) => [`${v >= 0 ? "+" : ""}${v.toFixed(2)}%`, "YTD"]}
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    />
                    <ReferenceLine x={0} stroke={CHART_GRID} />
                    <Bar dataKey="pct">
                      {ytdMoversData.map((m) => (
                        <Cell key={m.name} fill={m.pct >= 0 ? CHART_UP : CHART_DOWN} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </section>
        </div>
      )}

      {/* ── Holdings tab ──────────────────────────────────────────────────────── */}
      {tab === "holdings" && (
        <section className="mt-6 rounded-sm border border-hairline bg-surface">
          <div className="border-b border-hairline px-6 py-4">
            <p className="eyebrow text-text-muted">Holdings</p>
            <h2 className="mt-1 text-base font-medium tracking-[-0.01em] text-text-strong">
              Positions
            </h2>
          </div>
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 text-[var(--brand-periwinkle)]" rowSpan={2}>
                    Position
                  </TableHead>
                  <TableHead className="text-right" rowSpan={2}>
                    Units
                  </TableHead>
                  <TableHead className="text-right" rowSpan={2}>
                    Price (p)
                  </TableHead>
                  <TableHead className="text-right" rowSpan={2}>
                    Value (£)
                  </TableHead>
                  <TableHead className="text-right" rowSpan={2}>
                    Cost (£)
                  </TableHead>
                  <TableHead className="text-center border-l border-[var(--hairline)]" colSpan={2}>
                    Gain / loss
                  </TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="text-center border-l border-[var(--hairline)]">£</TableHead>
                  <TableHead className="text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="px-6 py-10 text-center text-text-muted">
                      No holdings to display.
                    </TableCell>
                  </TableRow>
                )}
                {grouped.map((g) => (
                  <Fragment key={g.bucket}>
                    <TableRow
                      className={
                        g.bucket === "Fund"
                          ? "bg-[var(--brand-periwinkle)]/[0.08] hover:bg-[var(--brand-periwinkle)]/[0.08]"
                          : "bg-[var(--surface-elevated)] hover:bg-[var(--surface-elevated)]"
                      }
                    >
                      <TableCell
                        colSpan={7}
                        className={`px-6 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] ${
                          g.bucket === "Fund"
                            ? "text-[var(--brand-periwinkle)]"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {g.bucket === "Stock" ? "Stocks" : g.bucket} · {g.rows.length}
                      </TableCell>
                    </TableRow>
                    {g.rows.map((r) => {
                      const pricePence = r.currency === "GBp" ? r.lastPrice : r.lastPrice * 100;
                      return (
                        <TableRow key={r.ticker}>
                          <TableCell className="pl-6">
                            <div className="font-medium leading-tight text-text-strong">
                              {r.name}
                            </div>
                            <span className="font-mono text-[11px] uppercase text-text-muted">
                              {r.ticker}
                            </span>
                          </TableCell>
                          <TableNumericCell className="text-text-body">
                            {new Intl.NumberFormat("en-GB", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 4,
                            }).format(r.units)}
                          </TableNumericCell>
                          <TableNumericCell className="text-text-body">
                            {new Intl.NumberFormat("en-GB", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }).format(pricePence)}
                          </TableNumericCell>
                          <TableNumericCell className="text-text-body">
                            {fmtGBP(r.marketValueGBP)}
                          </TableNumericCell>
                          <TableNumericCell className="text-text-body">
                            {fmtGBP(r.costGBP)}
                          </TableNumericCell>
                          <TableNumericCell
                            className={`border-l border-[var(--hairline)] ${dirClass(r.unrealisedGL)}`}
                          >
                            {fmtGBPSigned(r.unrealisedGL)}
                          </TableNumericCell>
                          <TableNumericCell className={dirClass(r.unrealisedPct)}>
                            {fmtPct(r.unrealisedPct)}
                          </TableNumericCell>
                        </TableRow>
                      );
                    })}
                  </Fragment>
                ))}
              </TableBody>
              {grouped.length > 0 && (
                <TableFooter>
                  <TableRow className="border-t-2 border-[var(--brand-periwinkle)]/40">
                    <TableCell className="pl-6 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-periwinkle)]">
                      Total
                    </TableCell>
                    <TableCell />
                    <TableCell />
                    <TableNumericCell className="font-medium text-text-strong">
                      {fmtGBP(p.marketValue)}
                    </TableNumericCell>
                    <TableNumericCell className="font-medium text-text-strong">
                      {fmtGBP(p.cost)}
                    </TableNumericCell>
                    <TableNumericCell
                      className={`border-l border-[var(--hairline)] font-medium ${dirClass(p.unrealisedGL)}`}
                    >
                      {fmtGBPSigned(p.unrealisedGL)}
                    </TableNumericCell>
                    <TableNumericCell className={`font-medium ${dirClass(p.unrealisedPct)}`}>
                      {fmtPct(p.unrealisedPct)}
                    </TableNumericCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </section>
      )}

      {/* ── Trades tab ───────────────────────────────────────────────────────── */}
      {tab === "trades" && (
        <section className="mt-6">
          <div className="rounded-sm border border-hairline bg-surface">
            <div className="border-b border-hairline px-6 py-4">
              <p className="eyebrow text-text-muted">Activity</p>
              <h2 className="mt-1 text-base font-medium tracking-[-0.01em] text-text-strong">
                Trade history
              </h2>
            </div>
            {profile.trades.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-muted">No trades to display.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[560px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-6">Type</TableHead>
                      <TableHead>Ticker</TableHead>
                      <TableHead className="text-right">Units</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right pr-6">Date</TableHead>
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
        </section>
      )}
    </PublicShell>
  );
}
