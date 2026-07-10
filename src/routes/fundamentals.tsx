import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { useTheme } from "@/components/ThemeProvider";
import { StockChart } from "@/components/StockChart";
import {
  clearFundamentalsCache,
  getEarnings,
  getNews,
  getPortfolio,
  getPriceHistory,
} from "@/fns/holdings";
import { compute } from "@/data/portfolio";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  dirClass,
  fmtCompact,
  fmtGBP,
  fmtGBPSigned,
  fmtMarketTime,
  fmtNum,
  fmtPct,
  fmtWordNum,
} from "@/lib/format";

const searchSchema = z.object({ ticker: z.string().optional() });

export const Route = createFileRoute("/fundamentals")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: ["portfolio"],
      queryFn: () => getPortfolio(),
    }),
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Fundamentals — StockTracker" },
      {
        name: "description",
        content: "Per-holding deep dive: chart, metrics, analyst, news, notes.",
      },
    ],
  }),
  component: FundamentalsPage,
});

function FundamentalsPage() {
  const { resolvedTheme } = useTheme();
  const onDark = resolvedTheme === "dark";
  const { data: portfolio } = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => getPortfolio(),
  });

  const holdings = portfolio?.holdings ?? [];
  const { ticker } = Route.useSearch();
  const [current, setCurrent] = useState<string>(ticker ?? holdings[0]?.ticker ?? "");
  const h = useMemo(
    () => holdings.find((x) => x.ticker === current) ?? holdings[0],
    [holdings, current],
  );

  const { data: news = [] } = useQuery({
    queryKey: ["news", current],
    queryFn: () => getNews({ data: { ticker: current } }),
    enabled: !!current,
  });

  const { data: earnings } = useQuery({
    queryKey: ["earnings", current],
    queryFn: () => getEarnings({ data: { ticker: current } }),
    enabled: !!current,
  });

  const { data: history1Y = [] } = useQuery({
    queryKey: ["history", current, "1Y"],
    queryFn: () => getPriceHistory({ data: { ticker: current, range: "1Y" } }),
    enabled: !!current,
  });

  const queryClient = useQueryClient();
  const { mutateAsync: refreshCache, isPending: refreshing } = useMutation({
    mutationFn: () => clearFundamentalsCache({ data: { ticker: current } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success("Data refreshed");
    },
    onError: () => toast.error("Refresh failed"),
  });

  const upside = h && h.lastPrice > 0 ? ((h.targetP - h.lastPrice) / h.lastPrice) * 100 : 0;

  const portfolioStats = useMemo(() => {
    if (!portfolio) return null;
    return compute(portfolio.holdings, portfolio.cashGBP);
  }, [portfolio]);

  const positionRow = useMemo(
    () => portfolioStats?.rows.find((r) => r.ticker === current),
    [portfolioStats, current],
  );

  const technicals = useMemo(() => {
    const closes = history1Y.map((b) => b.close).filter((c) => c > 0);
    if (closes.length < 14) return null;

    const sma = (n: number) => {
      const slice = closes.slice(-n);
      return slice.length === n ? slice.reduce((s, v) => s + v, 0) / n : null;
    };

    const sma50 = sma(50);
    const sma200 = sma(200);

    const changes = closes.slice(1).map((c, i) => c - closes[i]);
    let avgGain =
      changes
        .slice(0, 14)
        .filter((d) => d > 0)
        .reduce((s, d) => s + d, 0) / 14;
    let avgLoss =
      changes
        .slice(0, 14)
        .filter((d) => d < 0)
        .reduce((s, d) => s + Math.abs(d), 0) / 14;
    for (const d of changes.slice(14)) {
      avgGain = (avgGain * 13 + Math.max(d, 0)) / 14;
      avgLoss = (avgLoss * 13 + Math.max(-d, 0)) / 14;
    }
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - 100 / (1 + rs);

    const lastClose = closes.at(-1) ?? 0;
    return {
      sma50,
      sma200,
      rsi,
      vsS50: sma50 ? ((lastClose - sma50) / sma50) * 100 : null,
      vsS200: sma200 ? ((lastClose - sma200) / sma200) * 100 : null,
      goldenCross: sma50 != null && sma200 != null ? sma50 > sma200 : null,
    };
  }, [history1Y]);

  if (!h) {
    return (
      <AppShell>
        <div className="mb-8">
          <p className="eyebrow text-text-muted">Stock</p>
          <h1 className="mt-2 text-4xl font-medium tracking-[-0.02em] text-text-strong">
            Fundamentals
          </h1>
          <p className="mt-2 max-w-xl text-[15px] text-text-muted">
            No holdings to display. Add holdings to get started.
          </p>
        </div>
      </AppShell>
    );
  }

  const d = h.currency === "GBp" ? 100 : 1;
  const yearLowGBP = h.yearLow / d;
  const yearHighGBP = h.yearHigh / d;
  const dayLowGBP = h.dayLow / d;
  const dayHighGBP = h.dayHigh / d;

  const pct = (v?: number) => (v != null ? `${(v * 100).toFixed(1)}%` : undefined);
  const x1 = (v?: number) => (v != null ? v.toFixed(1) : undefined);
  const x2 = (v?: number) => (v != null ? v.toFixed(2) : undefined);

  return (
    <AppShell>
      {/* ── Page header ── */}
      <div className="mb-8">
        <p className="eyebrow text-text-muted">Stock</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-0.02em] text-text-strong">
          Fundamentals
        </h1>
        <p className="mt-2 max-w-xl text-[15px] text-text-muted">
          Per-holding deep dive — chart, valuation, growth, financial health and analyst view.
        </p>
      </div>

      {/* ── Stock identity header ── */}
      <div className="mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="rounded border border-hairline bg-[var(--surface-elevated)] px-2 py-0.5 font-mono text-[11px] font-medium tracking-widest text-text-strong">
                {current}
              </span>
              {h.sector && h.sector.length > 0 && (
                <span className="rounded-full border border-hairline bg-[var(--surface-elevated)] px-2.5 py-0.5 text-[10px] text-text-muted">
                  {h.sector}
                </span>
              )}
            </div>
            <h2 className="text-xl font-medium tracking-[-0.02em] text-text-strong">{h.name}</h2>
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <span className="num text-4xl font-medium tracking-tight text-text-strong">
                {fmtNum(h.lastPrice, h.currency === "GBp" ? 0 : 2)}
              </span>
              <span className="text-sm text-text-muted">{h.currency}</span>
              {h.prevClose > 0 && (
                <span
                  className={`num text-base font-semibold ${dirClass(h.lastPrice - h.prevClose)}`}
                >
                  {fmtPct(((h.lastPrice - h.prevClose) / h.prevClose) * 100, 2)}
                </span>
              )}
              <span className="text-xs text-text-muted">{fmtMarketTime(h.marketTime)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => refreshCache()}
              disabled={refreshing}
              title="Refresh data"
              className="rounded-lg border border-hairline bg-[var(--surface-elevated)] p-2 text-text-muted transition-colors hover:border-[var(--info)] hover:text-[var(--info)] disabled:opacity-40"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
            <Select value={current} onValueChange={setCurrent}>
              <SelectTrigger className="num w-72 border-2 border-[var(--info)] bg-[var(--surface-elevated)] text-sm font-semibold text-text-strong focus:ring-[var(--info)]/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-hairline bg-[var(--surface-elevated)] text-text-strong">
                {holdings.map((x) => (
                  <SelectItem
                    key={x.ticker}
                    value={x.ticker}
                    className="cursor-pointer text-text-strong focus:bg-[var(--surface)] focus:text-text-strong"
                  >
                    {x.ticker} — {x.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Position summary ── */}
      {positionRow && (
        <section className="mb-6">
          <PositionSummaryCard row={positionRow} allocActual={positionRow.allocActual} />
        </section>
      )}

      {/* ── Chart + valuation sidebar ── */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="self-start rounded-sm border border-hairline bg-surface p-5">
          <h2 className="eyebrow mb-4 text-text-muted">Price history</h2>
          <StockChart
            ticker={current}
            avgBuyP={h.avgBuyP}
            targetP={h.targetP}
            currency={h.currency}
            analyst={h.analyst}
            defaultRange="6M"
            height={340}
          />
          {yearLowGBP > 0 && yearHighGBP > 0 && (
            <YearRangeBar
              low={yearLowGBP}
              high={yearHighGBP}
              current={h.lastPrice / d}
              currency={h.currency}
            />
          )}
          <div className="mt-5 border-t border-hairline pt-4">
            <KeyStatsCard h={h} />
          </div>
        </div>

        <div className="space-y-4">
          <ValuationCard h={h} x1={x1} x2={x2} />
          <AnalystConsensusCard h={h} upside={upside} />
        </div>
      </section>

      {/* ── Profitability · Growth · Financial health ── */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ProfitabilityCard h={h} pct={pct} />
        <GrowthCard h={h} pct={pct} />
        <FinancialHealthCard h={h} x1={x1} x2={x2} />
      </section>

      {/* ── Trading data ── */}
      <section className="mt-6">
        <div className="rounded-sm border border-hairline bg-surface p-5">
          <h3 className="eyebrow mb-4 text-text-muted">Trading data</h3>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-4 text-xs sm:grid-cols-3 lg:grid-cols-6">
            <TradingStat
              label="Day range"
              v={
                dayLowGBP > 0 && dayHighGBP > 0
                  ? `${fmtNum(dayLowGBP, 2)} - ${fmtNum(dayHighGBP, 2)}`
                  : undefined
              }
            />
            <TradingStat
              label="52W range"
              v={
                yearLowGBP > 0 && yearHighGBP > 0
                  ? `${fmtNum(yearLowGBP, 2)} - ${fmtNum(yearHighGBP, 2)}`
                  : undefined
              }
            />
            <TradingStat label="Volume" v={h.volume > 0 ? fmtCompact(h.volume) : undefined} />
            <TradingStat
              label="Avg vol (3M)"
              v={h.avgVol3m > 0 ? fmtCompact(h.avgVol3m) : undefined}
            />
            <TradingStat
              label="Avg buy price"
              v={h.avgBuyP > 0 ? fmtNum(h.avgBuyP / d, 2) : undefined}
            />
            <TradingStat
              label="Hold period"
              v={h.holdPeriodDays > 0 ? `${h.holdPeriodDays}d` : undefined}
            />
          </dl>
        </div>
      </section>

      {/* ── Earnings ── */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {earnings?.nextEarningsDate ? (
          <EarningsCalendarCard nextDate={earnings.nextEarningsDate} quarters={earnings.quarters} />
        ) : (
          <SectionEmpty title="Earnings calendar" message="No upcoming earnings date available." />
        )}
        {earnings && earnings.quarters.length > 0 ? (
          <RevenueEpsChart quarters={earnings.quarters} />
        ) : (
          <SectionEmpty
            title="Quarterly financials"
            message="No quarterly financial data available."
          />
        )}
      </section>

      {/* ── Dividend ── */}
      <section className="mt-6">
        {h.divYield != null && h.divYield > 0 ? (
          <DividendCard h={h} />
        ) : (
          <SectionEmpty
            title="Dividend details"
            message="This holding does not currently pay a dividend."
          />
        )}
      </section>

      {/* ── Technical signals ── */}
      <section className="mt-6">
        {technicals ? (
          <TechnicalSignalsCard
            technicals={technicals}
            lastPrice={h.lastPrice / d}
            currency={h.currency}
          />
        ) : (
          <SectionEmpty
            title="Technical signals"
            message="Not enough price history to calculate signals."
          />
        )}
      </section>

      {/* ── News ── */}
      <section className="mt-6">
        <div className="rounded-sm border border-hairline bg-surface p-5">
          <h3 className="eyebrow mb-4 text-text-muted">Latest news</h3>
          {news.length > 0 ? (
            <ul className="divide-y divide-hairline">
              {news.map((n, i) => (
                <li key={i} className="py-3 first:pt-0 last:pb-0">
                  <a href={n.url} target="_blank" rel="noopener" className="group block">
                    <p className="text-sm leading-snug text-text-body transition-colors group-hover:text-[var(--primary)]">
                      {n.title}
                    </p>
                    <div className="num mt-1.5 flex items-center gap-2 text-[10px] text-text-muted">
                      <span className="rounded border border-hairline bg-[var(--surface-elevated)] px-1.5 py-0.5 font-medium">
                        {n.source}
                      </span>
                      <span>{n.date}</span>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-text-muted">No recent news found for {current}.</p>
          )}
        </div>
      </section>
    </AppShell>
  );
}

// ── Key stats card ─────────────────────────────────────────────────────────────

function KeyStatsCard({ h }: { h: import("@/data/portfolio").Holding }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
      <KeyStatItem label="Market cap" value={h.mktCap ? `£${fmtCompact(h.mktCap)}` : null} />
      <KeyStatItem label="P/E (TTM)" value={h.pe ? `${h.pe.toFixed(1)}x` : null} />
      <KeyStatItem
        label="Div yield"
        value={h.divYield != null && h.divYield > 0 ? `${(h.divYield * 100).toFixed(2)}%` : null}
        emptyMsg="No dividend"
      />
      <KeyStatItem
        label="YTD return"
        value={h.ytdPct != null ? fmtPct(h.ytdPct, 1) : null}
        tone={h.ytdPct}
      />
    </div>
  );
}

function KeyStatItem({
  label,
  value,
  tone,
  emptyMsg = "—",
}: {
  label: string;
  value: string | null;
  tone?: number;
  emptyMsg?: string;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] text-text-muted">{label}</div>
      {value != null ? (
        <div
          className={`num text-sm font-semibold ${tone != null ? dirClass(tone) : "text-text-strong"}`}
        >
          {value}
        </div>
      ) : (
        <div className="text-xs text-text-muted">{emptyMsg}</div>
      )}
    </div>
  );
}

// ── Position summary ───────────────────────────────────────────────────────────

function PositionSummaryCard({
  row,
  allocActual,
}: {
  row: import("@/data/portfolio").HoldingComputed;
  allocActual: number;
}) {
  const isGain = row.unrealisedGL >= 0;
  return (
    <div className="relative overflow-hidden rounded-sm border border-hairline bg-surface p-5">
      <div
        className={`absolute bottom-0 left-0 top-0 w-[3px] ${isGain ? "bg-[var(--up)]" : "bg-[var(--down)]"}`}
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 pl-3">
        <h3 className="eyebrow text-text-muted">Your position</h3>
        <div className="flex items-baseline gap-2">
          <span className={`num text-base font-medium ${dirClass(row.unrealisedGL)}`}>
            {fmtGBPSigned(row.unrealisedGL)}
          </span>
          <span className={`num text-xs ${dirClass(row.unrealisedGL)}`}>
            ({fmtPct(row.unrealisedPct, 1)})
          </span>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-8 gap-y-3 pl-3 text-xs sm:grid-cols-3 lg:grid-cols-5">
        <TradingStat label="Market value" v={fmtGBP(row.marketValueGBP)} />
        <TradingStat label="Cost basis" v={fmtGBP(row.costGBP)} />
        <TradingStat label="Units" v={fmtNum(row.units, row.units % 1 === 0 ? 0 : 4)} />
        <TradingStat
          label="Today"
          v={`${fmtGBPSigned(row.dayChangeGBP)} (${fmtPct(row.dayChangePct, 2)})`}
          tone={row.dayChangeGBP}
        />
        <TradingStat label="Weight" v={`${allocActual.toFixed(1)}%`} />
      </dl>
    </div>
  );
}

// ── Valuation card ─────────────────────────────────────────────────────────────

function ValuationCard({
  h,
  x1,
  x2,
}: {
  h: import("@/data/portfolio").Holding;
  x1: (v?: number) => string | undefined;
  x2: (v?: number) => string | undefined;
}) {
  return (
    <div className="rounded-sm border border-hairline bg-surface p-5">
      <h3 className="eyebrow mb-3 text-text-muted">Valuation</h3>
      <dl className="divide-y divide-hairline">
        <MetricRow label="P/E (TTM)" v={x1(h.pe)} />
        <MetricRow label="Forward P/E" v={x1(h.forwardPe)} />
        <MetricRow label="EV/EBITDA" v={x1(h.evEbitda)} />
        <MetricRow label="PEG ratio" v={x2(h.pegRatio)} />
        <MetricRow label="P/B ratio" v={x2(h.priceToBook)} />
        <MetricRow
          label="Div yield"
          v={h.divYield ? `${(h.divYield * 100).toFixed(1)}%` : undefined}
        />
        <MetricRow label="Mkt cap" v={h.mktCap ? `£${fmtCompact(h.mktCap)}` : undefined} />
        <MetricRow label="EPS (TTM)" v={h.eps != null ? `£${h.eps.toFixed(2)}` : undefined} />
        <MetricRow
          label="Fwd EPS"
          v={h.forwardEps != null ? `£${h.forwardEps.toFixed(2)}` : undefined}
        />
        {h.sector && h.sector.length > 0 && <MetricRow label="Sector" v={h.sector} />}
      </dl>
    </div>
  );
}

function MetricRow({ label, v, tone }: { label: string; v?: string; tone?: number }) {
  return (
    <div className="flex items-center justify-between py-2 text-xs">
      <dt className="text-text-muted">{label}</dt>
      <dd className={`num font-medium ${tone != null ? dirClass(tone) : "text-text-body"}`}>
        {v ?? "—"}
      </dd>
    </div>
  );
}

// ── Analyst consensus ──────────────────────────────────────────────────────────

function SectionEmpty({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-sm border border-hairline bg-surface p-5">
      <h3 className="eyebrow mb-3 text-text-muted">{title}</h3>
      <p className="text-xs text-text-muted">{message}</p>
    </div>
  );
}

function AnalystConsensusCard({
  h,
  upside,
}: {
  h: import("@/data/portfolio").Holding;
  upside: number;
}) {
  if (!h.analyst) {
    return (
      <SectionEmpty
        title="Analyst consensus"
        message={`No analyst coverage available for ${h.ticker}.`}
      />
    );
  }
  return (
    <div className="rounded-sm border border-hairline bg-surface p-5">
      <h3 className="eyebrow mb-3 text-text-muted">Analyst consensus</h3>
      <AnalystBar buy={h.analyst.buy} hold={h.analyst.hold} sell={h.analyst.sell} />
      {h.targetP > 0 && (
        <div className="mt-4 border-t border-hairline pt-4">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-text-muted">Price target</span>
            <span className={`num font-medium ${dirClass(upside)}`}>
              {fmtPct(upside, 1)} upside
            </span>
          </div>
          <div className="num mb-3 text-2xl font-medium text-text-strong">
            {fmtNum(h.targetP, 0)}
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="num text-sm text-text-body">{fmtNum(h.analyst.targetLow, 0)}</div>
              <div className="mt-0.5 text-[10px] text-text-muted">Low</div>
            </div>
            <div>
              <div className="num text-sm font-semibold text-text-strong">
                {fmtNum(h.targetP, 0)}
              </div>
              <div className="mt-0.5 text-[10px] text-text-muted">Avg</div>
            </div>
            <div>
              <div className="num text-sm text-text-body">{fmtNum(h.analyst.targetHigh, 0)}</div>
              <div className="mt-0.5 text-[10px] text-text-muted">High</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Profitability ──────────────────────────────────────────────────────────────

function ProfitabilityCard({
  h,
  pct,
}: {
  h: import("@/data/portfolio").Holding;
  pct: (v?: number) => string | undefined;
}) {
  return (
    <div className="rounded-sm border border-hairline bg-surface p-5">
      <h3 className="eyebrow mb-4 text-text-muted">Profitability</h3>
      <div className="space-y-3">
        <MarginMetric label="Gross margin" raw={h.grossMargin} v={pct(h.grossMargin)} />
        <MarginMetric label="Operating margin" raw={h.operatingMargin} v={pct(h.operatingMargin)} />
        <MarginMetric label="Profit margin" raw={h.profitMargin} v={pct(h.profitMargin)} />
        <MarginMetric label="FCF yield" raw={h.fcfYield} v={pct(h.fcfYield)} />
        <MarginMetric label="ROE" raw={h.roe} v={pct(h.roe)} />
        <MarginMetric label="ROIC" raw={h.roic} v={pct(h.roic)} />
      </div>
    </div>
  );
}

function MarginMetric({ label, v, raw }: { label: string; v?: string; raw?: number }) {
  const barWidth = raw != null ? Math.min(Math.max(Math.abs(raw * 100), 0), 100) : 0;
  const isPositive = raw == null || raw >= 0;
  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs">
        <span className="text-text-muted">{label}</span>
        <span className={`num font-medium ${raw != null ? dirClass(raw) : "text-text-body"}`}>
          {v ?? "—"}
        </span>
      </div>
      <div
        className="h-[3px] w-full rounded-full"
        style={{ background: "var(--surface-elevated)" }}
      >
        {raw != null && (
          <div
            className="h-full rounded-full"
            style={{
              width: `${barWidth}%`,
              background: isPositive ? "var(--up)" : "var(--down)",
              opacity: 0.5,
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Growth ─────────────────────────────────────────────────────────────────────

function GrowthCard({
  h,
  pct,
}: {
  h: import("@/data/portfolio").Holding;
  pct: (v?: number) => string | undefined;
}) {
  return (
    <div className="rounded-sm border border-hairline bg-surface p-5">
      <h3 className="eyebrow mb-4 text-text-muted">Growth</h3>
      <div className="space-y-5">
        <GrowthStat label="Revenue growth (YoY)" v={pct(h.revenueGrowth)} tone={h.revenueGrowth} />
        <GrowthStat label="Earnings growth" v={pct(h.earningsGrowth)} tone={h.earningsGrowth} />
        <GrowthStat
          label="YTD return"
          v={h.ytdPct != null ? fmtPct(h.ytdPct, 1) : undefined}
          tone={h.ytdPct}
        />
      </div>
    </div>
  );
}

function GrowthStat({ label, v, tone }: { label: string; v?: string; tone?: number }) {
  return (
    <div className="border-b border-hairline pb-5 last:border-b-0 last:pb-0">
      <div className="mb-1 text-[11px] text-text-muted">{label}</div>
      <div
        className={`num text-2xl font-medium ${tone != null ? dirClass(tone) : "text-text-body"}`}
      >
        {v ?? "—"}
      </div>
    </div>
  );
}

// ── Financial health ───────────────────────────────────────────────────────────

function FinancialHealthCard({
  h,
  x1,
  x2,
}: {
  h: import("@/data/portfolio").Holding;
  x1: (v?: number) => string | undefined;
  x2: (v?: number) => string | undefined;
}) {
  return (
    <div className="rounded-sm border border-hairline bg-surface p-5">
      <h3 className="eyebrow mb-3 text-text-muted">Financial health</h3>
      <dl className="divide-y divide-hairline">
        <MetricRow label="Net debt/EBITDA" v={x1(h.netDebtEbitda)} />
        <MetricRow
          label="Debt/equity"
          v={h.debtToEquity != null ? `${h.debtToEquity.toFixed(0)}%` : undefined}
        />
        <MetricRow label="Current ratio" v={x2(h.currentRatio)} />
        <MetricRow label="Beta" v={h.beta?.toFixed(2)} />
      </dl>
    </div>
  );
}

// ── 52-week range bar ──────────────────────────────────────────────────────────

function YearRangeBar({
  low,
  high,
  current,
  currency,
}: {
  low: number;
  high: number;
  current: number;
  currency: string;
}) {
  const pct = Math.min(100, Math.max(0, ((current - low) / (high - low)) * 100));
  const digits = currency === "GBp" ? 0 : 2;
  return (
    <div className="mt-5 border-t border-hairline pt-4">
      <div className="mb-2 flex items-center justify-between text-[11px] text-text-muted">
        <span>52-week range</span>
        <span className="num font-medium text-text-body">
          {fmtNum(current, digits)} {currency}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full border border-hairline bg-[var(--surface-elevated)]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--primary)] opacity-30"
          style={{ width: `${pct}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-1 -translate-y-1/2 rounded-sm bg-[var(--primary)]"
          style={{ left: `calc(${pct}% - 2px)` }}
        />
      </div>
      <div className="num mt-1.5 flex justify-between text-[10px] text-text-muted">
        <span>{fmtNum(low, digits)}</span>
        <span>{fmtNum(high, digits)}</span>
      </div>
    </div>
  );
}

// ── Earnings calendar ──────────────────────────────────────────────────────────

function EarningsCalendarCard({
  nextDate,
  quarters,
}: {
  nextDate: string;
  quarters: import("@/server/market/types").EarningsQuarter[];
}) {
  const today = new Date();
  const next = new Date(nextDate);
  const daysUntil = Math.ceil((next.getTime() - today.getTime()) / 86_400_000);
  const day = next.getDate();
  const suffix =
    day === 1 || day === 21 || day === 31
      ? "st"
      : day === 2 || day === 22
        ? "nd"
        : day === 3 || day === 23
          ? "rd"
          : "th";
  const month = next.toLocaleDateString("en-GB", { month: "long" });
  const dateLabel = `${day}${suffix} ${month} ${next.getFullYear()}`;

  return (
    <div className="rounded-sm border border-hairline bg-surface p-5">
      <h3 className="eyebrow mb-4 text-text-muted">Earnings calendar</h3>
      <div className="mb-4">
        <div className="num text-base font-semibold text-text-strong">{dateLabel}</div>
        <div className="mt-0.5 text-xs text-text-muted">
          {daysUntil > 0
            ? `in ${daysUntil} days`
            : daysUntil === 0
              ? "today"
              : `${Math.abs(daysUntil)} days ago`}
        </div>
      </div>
      {quarters.length > 0 && (
        <div>
          <div className="mb-2 grid grid-cols-3 text-[10px] uppercase tracking-wider text-text-muted">
            <span>Quarter</span>
            <span className="text-right">EPS est.</span>
            <span className="text-right">EPS actual</span>
          </div>
          <ul className="divide-y divide-hairline">
            {quarters.slice(-4).map((q) => {
              const beat = q.eps != null && q.epsEstimate != null ? q.eps - q.epsEstimate : null;
              return (
                <li key={q.label} className="grid grid-cols-3 py-1.5 text-xs">
                  <span className="num text-text-muted">{q.label}</span>
                  <span className="num text-right text-text-muted">
                    {q.epsEstimate != null ? q.epsEstimate.toFixed(2) : "—"}
                  </span>
                  <span
                    className={`num text-right font-medium ${beat != null ? dirClass(beat) : "text-text-body"}`}
                  >
                    {q.eps != null ? q.eps.toFixed(2) : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ── Quarterly revenue/EPS chart ────────────────────────────────────────────────

function RevenueEpsChart({
  quarters,
}: {
  quarters: import("@/server/market/types").EarningsQuarter[];
}) {
  const data = quarters.slice(-8).map((q) => ({
    label: q.label,
    revenue: q.revenue ?? null,
    eps: q.eps != null ? +q.eps.toFixed(2) : null,
  }));

  return (
    <div className="rounded-sm border border-hairline bg-surface p-5">
      <h3 className="eyebrow mb-1 text-text-muted">Quarterly financials</h3>
      <p className="mb-4 text-[11px] text-text-muted">Revenue</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--hairline)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => fmtCompact(v)}
            tick={{ fontSize: 10, fill: "var(--text-muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--canvas-dark)",
              border: "1px solid var(--hairline)",
              borderRadius: 4,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
            }}
            labelStyle={{ color: "var(--accent-mint)", fontSize: 11 }}
            itemStyle={{ color: "var(--on-dark)" }}
            formatter={(v: number) => [fmtWordNum(v), "Revenue"]}
          />
          <Bar dataKey="revenue" name="Revenue" radius={[3, 3, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill="var(--brand-periwinkle)" opacity={0.7} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Dividend ───────────────────────────────────────────────────────────────────

function DividendCard({ h }: { h: import("@/data/portfolio").Holding }) {
  return (
    <div className="rounded-sm border border-hairline bg-surface p-5">
      <h3 className="eyebrow mb-4 text-text-muted">Dividend details</h3>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-3 lg:grid-cols-6">
        <DivStat
          label="Annual yield"
          v={h.divYield != null ? `${(h.divYield * 100).toFixed(2)}%` : undefined}
        />
        <DivStat
          label="Annual rate"
          v={h.divRateAnnual != null ? fmtGBP(h.divRateAnnual) : undefined}
        />
        <DivStat
          label="Payout ratio"
          v={h.payoutRatio != null ? `${(h.payoutRatio * 100).toFixed(1)}%` : undefined}
        />
        <DivStat label="Ex-div date" v={h.exDivDate} />
        <DivStat label="Pay date" v={h.divPayDate} />
        <DivStat
          label="5Y avg yield"
          v={h.fiveYearAvgDivYield != null ? `${h.fiveYearAvgDivYield.toFixed(2)}%` : undefined}
        />
      </dl>
    </div>
  );
}

function DivStat({ label, v }: { label: string; v?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] text-text-muted">{label}</dt>
      <dd className="num text-xs font-medium text-text-body">{v ?? "—"}</dd>
    </div>
  );
}

// ── Technical signals ──────────────────────────────────────────────────────────

type Technicals = {
  sma50: number | null;
  sma200: number | null;
  rsi: number;
  vsS50: number | null;
  vsS200: number | null;
  goldenCross: boolean | null;
};

function TechnicalSignalsCard({
  technicals: t,
  lastPrice,
  currency,
}: {
  technicals: Technicals;
  lastPrice: number;
  currency: string;
}) {
  const digits = currency === "GBp" ? 0 : 2;
  const rsiLabel = t.rsi >= 70 ? "Overbought" : t.rsi <= 30 ? "Oversold" : "Neutral";
  const rsiColor =
    t.rsi >= 70 ? "text-[var(--down)]" : t.rsi <= 30 ? "text-[var(--up)]" : "text-text-muted";

  return (
    <div className="rounded-sm border border-hairline bg-surface p-5">
      <h3 className="eyebrow mb-4 text-text-muted">Technical signals</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SignalTile
          label="RSI (14)"
          value={t.rsi.toFixed(1)}
          sub={rsiLabel}
          valueClass={rsiColor}
          rsi={t.rsi}
        />
        {t.sma50 != null && (
          <SignalTile
            label="SMA 50"
            value={fmtNum(t.sma50, digits)}
            sub={t.vsS50 != null ? `${fmtPct(t.vsS50, 1)} vs price` : undefined}
            valueClass={t.vsS50 != null ? dirClass(t.vsS50) : undefined}
          />
        )}
        {t.sma200 != null && (
          <SignalTile
            label="SMA 200"
            value={fmtNum(t.sma200, digits)}
            sub={t.vsS200 != null ? `${fmtPct(t.vsS200, 1)} vs price` : undefined}
            valueClass={t.vsS200 != null ? dirClass(t.vsS200) : undefined}
          />
        )}
        {t.goldenCross != null && (
          <SignalTile
            label="MA cross"
            value={t.goldenCross ? "Golden" : "Death"}
            sub={t.goldenCross ? "50d above 200d" : "50d below 200d"}
            valueClass={t.goldenCross ? "text-[var(--up)]" : "text-[var(--down)]"}
          />
        )}
        <SignalTile label="Last price" value={fmtNum(lastPrice, digits)} sub={currency} />
      </div>
    </div>
  );
}

function SignalTile({
  label,
  value,
  sub,
  valueClass,
  rsi,
}: {
  label: string;
  value: string;
  sub?: string;
  valueClass?: string;
  rsi?: number;
}) {
  return (
    <div className="rounded-lg border border-hairline bg-[var(--surface-elevated)] p-3">
      <div className="mb-2 text-[10px] text-text-muted">{label}</div>
      <div className={`num text-lg font-medium ${valueClass ?? "text-text-body"}`}>{value}</div>
      {sub && <div className="mt-1 text-[10px] text-text-muted">{sub}</div>}
      {rsi !== undefined && (
        <div
          className="relative mt-2 h-[3px] overflow-hidden rounded-full"
          style={{ background: "var(--hairline)" }}
        >
          <div
            className="absolute inset-y-0 left-0 w-[30%] rounded-full"
            style={{ background: "var(--up)", opacity: 0.3 }}
          />
          <div
            className="absolute inset-y-0 right-0 w-[30%] rounded-full"
            style={{ background: "var(--down)", opacity: 0.3 }}
          />
          <div
            className="absolute inset-y-0 w-[3px] rounded-full"
            style={{
              left: `${rsi}%`,
              transform: "translateX(-50%)",
              background: rsi >= 70 ? "var(--down)" : rsi <= 30 ? "var(--up)" : "var(--primary)",
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Analyst bar ────────────────────────────────────────────────────────────────

function AnalystBar({ buy, hold, sell }: { buy: number; hold: number; sell: number }) {
  const total = buy + hold + sell || 1;
  return (
    <>
      <div className="flex h-2.5 overflow-hidden rounded-full">
        <div style={{ width: `${(buy / total) * 100}%`, background: "var(--up)", opacity: 0.8 }} />
        <div
          style={{
            width: `${(hold / total) * 100}%`,
            background: "var(--text-muted)",
            opacity: 0.6,
          }}
        />
        <div
          style={{ width: `${(sell / total) * 100}%`, background: "var(--down)", opacity: 0.8 }}
        />
      </div>
      <div className="num mt-2 flex justify-between text-[11px]">
        <span className="text-[var(--up)]">Buy {buy}</span>
        <span className="text-text-muted">Hold {hold}</span>
        <span className="text-[var(--down)]">Sell {sell}</span>
      </div>
    </>
  );
}

// ── TradingStat ────────────────────────────────────────────────────────────────

function TradingStat({ label, v, tone }: { label: string; v?: string; tone?: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] text-text-muted">{label}</dt>
      <dd
        className={`num text-xs font-medium ${tone !== undefined ? dirClass(tone) : "text-text-body"}`}
      >
        {v ?? "—"}
      </dd>
    </div>
  );
}
