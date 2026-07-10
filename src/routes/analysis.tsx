import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { ChartSkeleton } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { CorrelationMatrix } from "@/components/CorrelationMatrix";
import { AiInsights } from "@/components/AiInsights";
import { RebalancePanel } from "@/components/RebalancePanel";
import { getAnalysis } from "@/fns/analysis";
import { getPortfolio } from "@/fns/holdings";
import { compute } from "@/data/portfolio";
import { fmtGBP } from "@/lib/format";
import { BarChart3 } from "lucide-react";
import { PALETTE, getSectorColor, CHART_TOOLTIP_STYLE } from "@/lib/chart-theme";

export const Route = createFileRoute("/analysis")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: ["portfolio"],
      queryFn: () => getPortfolio(),
    }),
  head: () => ({
    meta: [
      { title: "Portfolio Analysis — StockTracker" },
      {
        name: "description",
        content: "Risk, diversification, attribution, income and AI insights.",
      },
    ],
  }),
  component: AnalysisPage,
});

type AnalysisRange = "1M" | "6M" | "YTD" | "1Y" | "5Y" | "All";
const RANGES: AnalysisRange[] = ["1M", "6M", "YTD", "1Y", "5Y", "All"];

const BENCHMARKS = [
  { label: "No benchmark", ticker: "" },
  { label: "S&P 500", ticker: "^GSPC" },
  { label: "FTSE 100", ticker: "^FTSE" },
  { label: "Nasdaq", ticker: "^IXIC" },
  { label: "MSCI World", ticker: "URTH" },
] as const;

const CHART_TICK = { fill: "var(--text-muted)", fontSize: 11, fontFamily: "JetBrains Mono" };

function AnalysisPage() {
  const [range, setRange] = useState<AnalysisRange>("1Y");
  const [benchmark, setBenchmark] = useState("");

  const { data: portfolio } = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => getPortfolio(),
  });

  const { data: analysis, isLoading } = useQuery({
    queryKey: ["analysis", range, benchmark],
    queryFn: () => getAnalysis({ data: { range, benchmark: benchmark || undefined } }),
    staleTime: 5 * 60_000,
  });

  const computed = useMemo(
    () => compute(portfolio?.holdings ?? [], portfolio?.cashGBP ?? 0),
    [portfolio],
  );

  return (
    <AppShell>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-text-muted">Portfolio</p>
          <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-text-strong">Analysis</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={benchmark}
            onChange={(e) => setBenchmark(e.target.value)}
            className="num cursor-pointer rounded-md border border-hairline bg-[var(--surface-elevated)] px-2 py-1 text-xs text-text-muted hover:text-text-body"
          >
            {BENCHMARKS.map((b) => (
              <option key={b.ticker} value={b.ticker}>
                {b.label}
              </option>
            ))}
          </select>
          <div className="grid grid-cols-6 gap-0.5 rounded-sm bg-[var(--surface-elevated)] p-1">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-xs px-2.5 py-1 font-mono text-xs uppercase tracking-[0.04em] transition-colors ${
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
      </div>

      {isLoading ? (
        <div className="mt-8 space-y-6">
          <ChartSkeleton height={80} />
          <ChartSkeleton height={280} />
          <ChartSkeleton height={200} />
        </div>
      ) : !analysis ? (
        <div className="mt-16">
          <EmptyState
            icon={<BarChart3 />}
            title="No analysis data"
            description="Add holdings and transactions to generate portfolio analytics."
          />
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          <AiInsights />

          {/* Risk */}
          <Section title="Risk" subtitle="Volatility, Sharpe ratio and drawdown">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard
                label="Annualised Vol"
                value={`${analysis.risk.annualizedVolPct.toFixed(1)}%`}
              />
              <KpiCard label="Sharpe Ratio" value={analysis.risk.sharpePct.toFixed(2)} />
              <KpiCard
                label="Max Drawdown"
                value={`${analysis.risk.maxDrawdownPct.toFixed(1)}%`}
                tone="down"
              />
              <KpiCard
                label="Beta"
                value={
                  analysis.risk.betaVsBenchmark != null
                    ? analysis.risk.betaVsBenchmark.toFixed(2)
                    : "—"
                }
                sub={!benchmark ? "Select a benchmark" : undefined}
              />
            </div>

            {analysis.risk.drawdownSeries.length > 0 && (
              <div className="mt-4 h-[180px]">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                  Drawdown series
                </p>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={analysis.risk.drawdownSeries}
                    margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--down)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--down)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="ts"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tickFormatter={(t) =>
                        new Date(t).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
                      }
                      tick={CHART_TICK}
                      axisLine={{ stroke: "var(--hairline)" }}
                      tickLine={false}
                      minTickGap={48}
                    />
                    <YAxis
                      tickFormatter={(v) => `${v.toFixed(0)}%`}
                      tick={CHART_TICK}
                      axisLine={false}
                      tickLine={false}
                      width={44}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(v: number) => [`${v.toFixed(2)}%`, "Drawdown"]}
                      labelFormatter={(t) =>
                        new Date(t as number).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      }
                    />
                    <ReferenceLine y={0} stroke="var(--hairline)" />
                    <Area
                      type="monotone"
                      dataKey="pct"
                      stroke="var(--down)"
                      strokeWidth={1.5}
                      fill="url(#ddGrad)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          {/* Diversification */}
          <Section title="Diversification" subtitle="Concentration, sector and currency exposure">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard
                label="HHI"
                value={analysis.diversification.hhi.toFixed(0)}
                sub={
                  analysis.diversification.hhi < 1500
                    ? "Well diversified"
                    : analysis.diversification.hhi < 2500
                      ? "Moderate"
                      : "Concentrated"
                }
              />
              {analysis.diversification.topHoldingsConcentration.slice(0, 3).map((h) => (
                <KpiCard
                  key={h.ticker}
                  label={h.ticker}
                  value={`${h.allocPct.toFixed(1)}%`}
                  sub={h.name}
                />
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <DonutCard
                title="By Sector"
                data={analysis.diversification.bySector.map((d, i) => ({
                  label: d.label,
                  pct: d.pct,
                  color: getSectorColor(d.label, i),
                }))}
              />
              <DonutCard
                title="By Currency"
                data={analysis.diversification.byCurrency.map((d, i) => ({
                  label: d.label,
                  pct: d.pct,
                  color: PALETTE[i % PALETTE.length],
                }))}
              />
              <DonutCard
                title="By Type"
                data={analysis.diversification.byBucket.map((d, i) => ({
                  label: d.label,
                  pct: d.pct,
                  color: PALETTE[(i + 4) % PALETTE.length],
                }))}
              />
            </div>

            {analysis.diversification.correlation && (
              <div className="mt-4 overflow-x-auto rounded-lg border border-hairline p-4">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                  Correlation matrix (top 15 holdings)
                </p>
                <CorrelationMatrix
                  tickers={analysis.diversification.correlation.tickers}
                  matrix={analysis.diversification.correlation.matrix}
                />
              </div>
            )}
          </Section>

          {/* Attribution */}
          <Section title="Attribution" subtitle={`Return contribution over ${range}`}>
            {analysis.attribution.byHolding.length === 0 ? (
              <p className="text-sm text-text-muted">
                Not enough price history for attribution in this range.
              </p>
            ) : (
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...analysis.attribution.byHolding].sort(
                      (a, b) => b.contribution - a.contribution,
                    )}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="ticker"
                      type="category"
                      width={60}
                      tick={CHART_TICK}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: string) => v.replace(".L", "")}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(v: number, _n, item) => [
                        `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
                        item?.payload?.name ?? "Contribution",
                      ]}
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    />
                    <ReferenceLine x={0} stroke="var(--hairline)" />
                    <Bar dataKey="contribution" radius={[0, 2, 2, 0]}>
                      {analysis.attribution.byHolding.map((h) => (
                        <Cell
                          key={h.ticker}
                          fill={h.contribution >= 0 ? "var(--up)" : "var(--down)"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          {/* Income */}
          <Section title="Income" subtitle="Projected dividends and yield">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <KpiCard
                label="Projected Annual"
                value={fmtGBP(analysis.income.projectedAnnualGBP)}
              />
              <KpiCard
                label="Portfolio Yield"
                value={`${analysis.income.portfolioYieldPct.toFixed(2)}%`}
              />
              <KpiCard label="Paying holdings" value={`${analysis.income.byHolding.length}`} />
            </div>

            {analysis.income.byHolding.length > 0 && (
              <div className="mt-4 h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[...analysis.income.byHolding]
                      .filter((h) => h.annualIncomeGBP > 0)
                      .sort((a, b) => b.annualIncomeGBP - a.annualIncomeGBP)}
                    margin={{ top: 4, right: 0, left: 0, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="ticker"
                      tick={CHART_TICK}
                      axisLine={{ stroke: "var(--hairline)" }}
                      tickLine={false}
                      tickFormatter={(v: string) => v.replace(".L", "")}
                    />
                    <YAxis
                      tickFormatter={(v) => `£${v}`}
                      tick={CHART_TICK}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                    />
                    <Tooltip
                      contentStyle={CHART_TOOLTIP_STYLE}
                      formatter={(v: number, _n, item) => [
                        fmtGBP(v),
                        `${item?.payload?.name ?? ""} (YOC: ${item?.payload?.yieldOnCostPct?.toFixed(2) ?? "—"}%)`,
                      ]}
                      cursor={{ fill: "rgba(0,0,0,0.04)" }}
                    />
                    <Bar
                      dataKey="annualIncomeGBP"
                      fill="var(--brand-periwinkle)"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Section>

          {/* Rebalancing */}
          <Section title="Rebalancing" subtitle="Suggested trades to reach target allocation">
            <RebalancePanel rows={computed.rows} totalValue={computed.totalValue} />
          </Section>
        </div>
      )}
    </AppShell>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-hairline bg-[var(--surface-card)] p-5">
      <div className="mb-4 border-b border-hairline pb-3">
        <p className="eyebrow text-text-muted">{title}</p>
        {subtitle && <p className="mt-0.5 text-xs text-text-muted opacity-70">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down";
}) {
  const valueClass =
    tone === "up"
      ? "text-[var(--up)]"
      : tone === "down"
        ? "text-[var(--down)]"
        : "text-text-strong";
  return (
    <div className="rounded-md border border-hairline bg-[var(--surface-elevated)] px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className={`num mt-1 text-lg font-semibold ${valueClass}`}>{value}</p>
      {sub && <p className="mt-0.5 truncate text-[11px] text-text-muted">{sub}</p>}
    </div>
  );
}

function DonutCard({
  title,
  data,
}: {
  title: string;
  data: { label: string; pct: number; color: string }[];
}) {
  return (
    <div className="rounded-md border border-hairline p-3">
      <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-text-muted">{title}</p>
      <div className="h-[110px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="pct"
              nameKey="label"
              innerRadius={30}
              outerRadius={50}
              paddingAngle={1}
              stroke="var(--surface-card)"
              strokeWidth={2}
            >
              {data.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={CHART_TOOLTIP_STYLE}
              formatter={(v: number, _n, item) => [
                `${(v as number).toFixed(1)}%`,
                item?.payload?.label,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-1 space-y-1">
        {data.slice(0, 5).map((d) => (
          <li key={d.label} className="flex items-center gap-2 text-[11px]">
            <span className="size-2 shrink-0 rounded-sm" style={{ background: d.color }} />
            <span className="truncate text-text-muted">{d.label}</span>
            <span className="num ml-auto text-text-body">{d.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
