import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeftRight, Loader2, Lock, Plus, Trash2, Unlock } from "lucide-react";
import { Fragment, useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Area,
  Bar,
  BarChart,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { ChartSkeleton } from "@/components/Skeletons";

import { toast } from "sonner";
import {
  addHolding,
  addLot,
  deleteHolding,
  getBenchmarkHistory,
  getPortfolio,
  getPortfolioHistory,
  getPriceForDate,
  searchTicker,
  sellUnits,
} from "@/fns/holdings";
import { compute, type Bucket, type Holding } from "@/data/portfolio";
import { dirClass, fmtGBP, fmtGBPSigned, fmtPct } from "@/lib/format";

export const Route = createFileRoute("/")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: ["portfolio"],
      queryFn: () => getPortfolio(),
    }),
  head: () => ({
    meta: [
      { title: "Summary — StockTracker" },
      {
        name: "description",
        content: "Portfolio performance, allocation and live holdings table.",
      },
    ],
  }),
  component: SummaryPage,
});

type Range = "1D" | "5D" | "1M" | "6M" | "YTD" | "1Y" | "All";
const RANGES: Range[] = ["1D", "5D", "1M", "6M", "YTD", "1Y", "All"];

const BENCHMARKS = [
  { label: "vs Index…", ticker: "" },
  { label: "S&P 500", ticker: "^GSPC" },
  { label: "FTSE 100", ticker: "^FTSE" },
  { label: "Nasdaq", ticker: "^IXIC" },
  { label: "Dow Jones", ticker: "^DJI" },
  { label: "MSCI World", ticker: "URTH" },
  { label: "Vanguard FTSE All-World", ticker: "VWRL.L" },
] as const;

const SECTOR_COLORS: Record<string, string> = {
  Fund: "#38bdf8",
  ETF: "#a78bfa",
  MUTUALFUND: "#a78bfa",
  Bond: "#fbbf24",
  BOND: "#fbbf24",
  Gilt: "#fbbf24",
  Future: "#fb923c",
  FUTURE: "#fb923c",
  Technology: "#f472b6",
  Tech: "#f472b6",
  Pharma: "#fcd535",
  Banking: "#22d3ee",
  Defence: "#818cf8",
  Consumer: "#f87171",
  Industrial: "#60a5fa",
  Infrastructure: "#34d399",
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
  "#f472b6",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#a78bfa",
  "#fb923c",
  "#22d3ee",
  "#4ade80",
  "#f87171",
  "#818cf8",
  "#fcd535",
  "#38bdf8",
  "#86efac",
  "#c084fc",
  "#67e8f9",
];

function SummaryPage() {
  const queryClient = useQueryClient();
  const { data: portfolio } = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => getPortfolio(),
  });

  const holdings = portfolio?.holdings ?? [];
  const cashGBP = portfolio?.cashGBP ?? 0;
  const realisedGL = portfolio?.realisedGL ?? 0;

  const p = useMemo(() => compute(holdings, cashGBP), [holdings, cashGBP]);
  const [range, setRange] = useState<Range>("1Y");

  const { data: history = [], isFetching: historyFetching } = useQuery({
    queryKey: ["portfolio-history", range],
    queryFn: () => getPortfolioHistory({ data: { range } }),
    enabled: holdings.length > 0,
  });

  const [benchmark, setBenchmark] = useState("");

  const { data: benchmarkRaw = [] } = useQuery({
    queryKey: ["benchmark", benchmark, range],
    queryFn: () => getBenchmarkHistory({ data: { ticker: benchmark, range } }),
    enabled: !!benchmark,
    staleTime: 5 * 60_000,
  });

  type TradeTarget = {
    ticker: string;
    name: string;
    units: number;
    lastPrice: number;
    mode: "buy" | "sell";
  };
  type DeleteTarget = { ticker: string; name: string; units: number; lastPrice: number };
  const [tradeTarget, setTradeTarget] = useState<TradeTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Portfolio chart zoom state
  const [perfRefLeft, setPerfRefLeft] = useState<number | null>(null);
  const [perfRefRight, setPerfRefRight] = useState<number | null>(null);
  const [perfZoomDomain, setPerfZoomDomain] = useState<[number, number] | null>(null);
  const perfSelecting = useRef(false);

  const perfHistory = perfZoomDomain
    ? history.filter((h) => h.ts >= perfZoomDomain[0] && h.ts <= perfZoomDomain[1])
    : history;

  const mergedHistory = useMemo(() => {
    if (!benchmark || !benchmarkRaw.length || !perfHistory.length) return perfHistory;
    return perfHistory.map((pt) => {
      let lo = 0,
        hi = benchmarkRaw.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (benchmarkRaw[mid].ts < pt.ts) lo = mid + 1;
        else hi = mid;
      }
      const left = benchmarkRaw[Math.max(0, lo - 1)];
      const right = benchmarkRaw[lo];
      const nearest = Math.abs(left.ts - pt.ts) <= Math.abs(right.ts - pt.ts) ? left : right;
      return { ...pt, benchValue: nearest.value };
    });
  }, [perfHistory, benchmarkRaw, benchmark]);

  const allValues = mergedHistory.length
    ? [
        ...mergedHistory.map((h) => h.value),
        ...(benchmark
          ? mergedHistory.map((h) => (h as { benchValue?: number }).benchValue ?? h.value)
          : []),
      ]
    : [];
  const perfYMin = allValues.length ? Math.min(...allValues) - 200 : ("auto" as const);
  const perfYMax = allValues.length ? Math.max(...allValues) + 200 : ("auto" as const);

  const handlePerfMouseMove = useCallback((e: any) => {
    if (perfSelecting.current && e?.activeLabel != null) {
      setPerfRefRight(e.activeLabel as number);
    }
  }, []);

  const handlePerfMouseDown = useCallback((e: any) => {
    if (e?.activeLabel != null) {
      perfSelecting.current = true;
      setPerfRefLeft(e.activeLabel as number);
      setPerfRefRight(null);
    }
  }, []);

  const handlePerfMouseUp = useCallback(() => {
    if (
      perfSelecting.current &&
      perfRefLeft != null &&
      perfRefRight != null &&
      perfRefLeft !== perfRefRight
    ) {
      const l = Math.min(perfRefLeft, perfRefRight);
      const r = Math.max(perfRefLeft, perfRefRight);
      if (r > l) setPerfZoomDomain([l, r]);
    }
    perfSelecting.current = false;
    setPerfRefLeft(null);
    setPerfRefRight(null);
  }, [perfRefLeft, perfRefRight]);

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

  const visibleRows = p.rows;

  const grouped = useMemo(() => {
    const order: Bucket[] = ["Fund", "Stock"];
    return order
      .map((b) => ({ bucket: b, rows: visibleRows.filter((r) => r.bucket === b) }))
      .filter((g) => g.rows.length);
  }, [visibleRows]);

  const costBasis = p.cost + cashGBP;
  const lastValue = history.at(-1)?.value ?? 0;
  const gainPct = costBasis > 0 ? (lastValue / costBasis - 1) * 100 : 0;

  return (
    <AppShell>
      {/* HERO: KPI + performance chart */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-xl border border-hairline bg-surface p-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
            Total portfolio value
          </div>
          <div className="num mt-2 text-[40px] font-bold leading-none text-text-strong">
            {fmtGBP(p.totalValue)}
          </div>
          {holdings.length === 0 && (
            <div className="mt-1 text-xs text-text-muted">No holdings data</div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-hairline pt-5">
            <KpiRow label="Market value" value={fmtGBP(p.marketValue)} />
            <KpiRow label="Cash" value={fmtGBP(cashGBP)} />
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
            <KpiRow label="Cost basis" value={fmtGBP(costBasis)} />
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-surface p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-muted">
                Performance
              </div>
              <div className="mt-1 flex items-baseline gap-3">
                <div className="num text-2xl font-semibold text-text-strong">
                  {fmtGBP(lastValue)}
                </div>
                <div className={`num text-sm font-medium ${dirClass(gainPct)}`}>
                  {fmtPct(gainPct)} vs cost
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {perfZoomDomain && (
                <button
                  onClick={() => setPerfZoomDomain(null)}
                  className="rounded px-2 py-1 text-[10px] border border-hairline text-[var(--primary)] hover:bg-canvas transition-colors"
                >
                  ↺ Reset
                </button>
              )}
              <select
                value={benchmark}
                onChange={(e) => setBenchmark(e.target.value)}
                className="num cursor-pointer rounded-md border border-hairline bg-[var(--surface-elevated)] px-2 py-1 text-xs text-text-muted transition-colors hover:text-text-body"
                style={{ colorScheme: "dark" }}
              >
                {BENCHMARKS.map((b) => (
                  <option key={b.ticker} value={b.ticker}>
                    {b.label}
                  </option>
                ))}
              </select>
              <div className="flex flex-wrap gap-1 rounded-md border border-hairline bg-[var(--surface-elevated)] p-1">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setRange(r);
                      setPerfZoomDomain(null);
                    }}
                    className={`rounded num px-2.5 py-1 text-xs transition-colors ${
                      range === r
                        ? "bg-canvas text-[var(--primary)]"
                        : "text-text-muted hover:text-text-body"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative mt-4 h-[280px] select-none cursor-crosshair">
            {historyFetching && perfHistory.length === 0 && (
              <div className="absolute inset-0 z-10">
                <ChartSkeleton height={280} />
              </div>
            )}
            {!historyFetching && perfHistory.length === 0 && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-lg bg-canvas/80 backdrop-blur-sm">
                <span className="text-2xl">📭</span>
                <p className="text-sm font-medium text-text-muted">
                  No data available for this range
                </p>
                <p className="text-xs text-text-muted opacity-60">Try a longer time period</p>
              </div>
            )}
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={mergedHistory}
                margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
                onMouseMove={handlePerfMouseMove}
                onMouseDown={handlePerfMouseDown}
                onMouseUp={handlePerfMouseUp}
                onMouseLeave={() => {
                  if (perfSelecting.current) {
                    perfSelecting.current = false;
                    setPerfRefLeft(null);
                    setPerfRefRight(null);
                  }
                }}
              >
                <defs>
                  <linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fcd535" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#fcd535" stopOpacity={0} />
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
                  tick={{ fill: "#707a8a", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  axisLine={{ stroke: "#2b3139" }}
                  tickLine={false}
                  minTickGap={48}
                />
                <YAxis
                  domain={[perfYMin, perfYMax]}
                  tickFormatter={(v) => `£${(v / 1000).toFixed(1)}k`}
                  tick={{ fill: "#707a8a", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip
                  cursor={{ stroke: "#38bdf8", strokeWidth: 1, strokeDasharray: "3 3" }}
                  contentStyle={{
                    background: "#0f1923",
                    border: "1px solid #38bdf8",
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "JetBrains Mono",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                  }}
                  labelStyle={{ color: "#38bdf8", fontSize: 11 }}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelFormatter={(t) => new Date(t as number).toLocaleString("en-GB")}
                  formatter={(v: number, name: string) => [
                    fmtGBP(v),
                    name === "benchValue"
                      ? (BENCHMARKS.find((b) => b.ticker === benchmark)?.label ?? "Benchmark")
                      : "Portfolio",
                  ]}
                />
                {costBasis > 0 && (
                  <ReferenceLine
                    y={costBasis}
                    stroke="#f6465d"
                    strokeDasharray="4 4"
                    label={{
                      value: `Cost £${(costBasis / 1000).toFixed(1)}k`,
                      fill: "#f6465d",
                      fontSize: 10,
                      position: "insideTopLeft",
                    }}
                  />
                )}
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#fcd535"
                  strokeWidth={2}
                  fill="url(#perfGrad)"
                  isAnimationActive={false}
                />
                {benchmark && (
                  <Line
                    type="monotone"
                    dataKey="benchValue"
                    stroke="#38bdf8"
                    strokeWidth={1.5}
                    strokeDasharray="5 3"
                    dot={false}
                    isAnimationActive={false}
                    name="benchValue"
                  />
                )}
                {perfRefLeft != null && perfRefRight != null && perfRefLeft !== perfRefRight && (
                  <ReferenceArea
                    x1={Math.min(perfRefLeft, perfRefRight)}
                    x2={Math.max(perfRefLeft, perfRefRight)}
                    fill="#929aa5"
                    fillOpacity={0.12}
                    stroke="#929aa5"
                    strokeOpacity={0.4}
                    strokeWidth={1}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* CHART GRID */}
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
                  stroke="#0b0e11"
                  strokeWidth={2}
                  activeShape={(props: any) => <Sector {...props} />}
                >
                  {sectorData.map((s) => (
                    <Cell key={s.name} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0f1923",
                    border: "1px solid #38bdf8",
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "JetBrains Mono",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                  }}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelStyle={{ color: "#38bdf8", fontSize: 11 }}
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
                  {((s.value / p.marketValue) * 100).toFixed(1)}%
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
                  stroke="#0b0e11"
                  strokeWidth={2}
                  activeShape={(props: any) => <Sector {...props} />}
                >
                  {stockData.map((s) => (
                    <Cell key={s.ticker} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0f1923",
                    border: "1px solid #38bdf8",
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "JetBrains Mono",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                  }}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelStyle={{ color: "#38bdf8", fontSize: 11 }}
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
                  tick={{ fill: "#929aa5", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0f1923",
                    border: "1px solid #38bdf8",
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "JetBrains Mono",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                  }}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelStyle={{ color: "#38bdf8", fontSize: 11 }}
                  formatter={(v: number) => [`${v >= 0 ? "+" : ""}${v.toFixed(2)}%`, "Day"]}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <ReferenceLine x={0} stroke="#2b3139" />
                <Bar dataKey="pct">
                  {moversData.map((m) => (
                    <Cell key={m.name} fill={m.pct >= 0 ? "#0ecb81" : "#f6465d"} />
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
                  tick={{ fill: "#929aa5", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0f1923",
                    border: "1px solid #38bdf8",
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "JetBrains Mono",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                  }}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelStyle={{ color: "#38bdf8", fontSize: 11 }}
                  formatter={(v: number) => [`${v >= 0 ? "+" : ""}${v.toFixed(2)}%`, "YTD"]}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <ReferenceLine x={0} stroke="#2b3139" />
                <Bar dataKey="pct">
                  {ytdMoversData.map((m) => (
                    <Cell key={m.name} fill={m.pct >= 0 ? "#0ecb81" : "#f6465d"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      {/* HOLDINGS TABLE */}
      <section className="mt-8 rounded-xl border border-hairline bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-6 py-4">
          <h2 className="text-base font-semibold text-text-strong">Holdings</h2>
          <div className="flex items-center gap-3">
            <AddHoldingDialog />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] border-collapse text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-text-muted border-b border-hairline">
                <th
                  className="text-left pl-6 py-3 font-semibold text-[#fcd535]"
                  style={{ borderLeft: "3px solid #fcd535" }}
                  rowSpan={2}
                >
                  Positions
                </th>
                <th className="text-right px-3 py-3 font-semibold" rowSpan={2}>
                  Units held
                </th>
                <th className="text-right px-3 py-3 font-semibold" rowSpan={2}>
                  Price (p)
                </th>
                <th className="text-right px-3 py-3 font-semibold" rowSpan={2}>
                  Value (£)
                </th>
                <th className="text-right px-3 py-3 font-semibold" rowSpan={2}>
                  Cost (£)
                </th>
                <th
                  className="text-center px-3 py-2 font-semibold border-l border-hairline"
                  colSpan={2}
                >
                  Gain / loss
                </th>
                <th className="text-right px-3 pr-6 py-3 font-semibold" rowSpan={2}>
                  Actions
                </th>
              </tr>
              <tr className="text-[11px] uppercase tracking-wider text-text-muted border-b border-hairline">
                <th className="text-center px-3 py-2 font-medium border-l border-hairline">£</th>
                <th className="text-center px-3 py-2 font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {grouped.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-sm text-text-muted">
                    No holdings yet — click &ldquo;Add holding&rdquo; to get started.
                  </td>
                </tr>
              )}
              {grouped.map((g) => (
                <Fragment key={g.bucket}>
                  <tr
                    style={{
                      borderLeft: `3px solid ${g.bucket === "Fund" ? "#38bdf8" : "#818cf8"}`,
                    }}
                    className={g.bucket === "Fund" ? "bg-[#38bdf8]/[0.08]" : "bg-[#818cf8]/[0.08]"}
                  >
                    <td
                      colSpan={8}
                      className={`px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${g.bucket === "Fund" ? "text-[#38bdf8]" : "text-[#818cf8]"}`}
                    >
                      {g.bucket === "Stock" ? "Stocks" : g.bucket} · {g.rows.length}
                    </td>
                  </tr>
                  {g.rows.map((r) => {
                    const pricePence = r.currency === "GBp" ? r.lastPrice : r.lastPrice * 100;
                    const unitsFmt = new Intl.NumberFormat("en-GB", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 4,
                    }).format(r.units);
                    const priceFmt = new Intl.NumberFormat("en-GB", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }).format(pricePence);
                    return (
                      <tr
                        key={r.ticker}
                        className="border-t border-hairline transition-colors hover:bg-[var(--surface-elevated)]/40"
                      >
                        <td className="pl-6 pr-3 py-3">
                          <Link
                            to="/fundamentals"
                            search={{ ticker: r.ticker }}
                            className="block font-semibold leading-tight text-text-strong hover:text-[var(--primary)]"
                          >
                            {r.name}
                          </Link>
                          <span className="font-mono text-[11px] text-text-muted">{r.ticker}</span>
                        </td>
                        <td className="num px-3 py-3 text-right text-text-body">{unitsFmt}</td>
                        <td className="num px-3 py-3 text-right text-text-body">{priceFmt}</td>
                        <td className="num px-3 py-3 text-right text-text-body">
                          {fmtGBP(r.marketValueGBP)}
                        </td>
                        <td className="num px-3 py-3 text-right text-text-body">
                          {fmtGBP(r.costGBP)}
                        </td>
                        <td
                          className={`num px-3 py-3 text-right border-l border-hairline ${dirClass(r.unrealisedGL)}`}
                        >
                          {fmtGBPSigned(r.unrealisedGL)}
                        </td>
                        <td className={`num px-3 py-3 text-right ${dirClass(r.unrealisedPct)}`}>
                          {fmtPct(r.unrealisedPct)}
                        </td>
                        <td className="px-2 py-2 pr-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              title="Trade"
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#0ecb81] opacity-60 transition-all hover:bg-[#0ecb81]/10 hover:opacity-100"
                              onClick={() =>
                                setTradeTarget({
                                  ticker: r.ticker,
                                  name: r.name,
                                  units: r.units,
                                  lastPrice: r.lastPrice,
                                  mode: "buy",
                                })
                              }
                            >
                              <ArrowLeftRight className="h-3.5 w-3.5" />
                            </button>
                            <button
                              title="Delete"
                              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[#f6465d] opacity-60 transition-all hover:bg-[#f6465d]/10 hover:opacity-100"
                              onClick={() =>
                                setDeleteTarget({
                                  ticker: r.ticker,
                                  name: r.name,
                                  units: r.units,
                                  lastPrice: r.lastPrice,
                                })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
              {grouped.length > 0 && (
                <tr className="border-t-2 border-[#fcd535]/40 bg-[#fcd535]/[0.07]">
                  <td className="pl-6 pr-3 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#fcd535]">
                    Total
                  </td>
                  <td className="px-3 py-3" />
                  <td className="px-3 py-3" />
                  <td className="num px-3 py-3 text-right font-semibold text-text-strong">
                    {fmtGBP(p.marketValue)}
                  </td>
                  <td className="num px-3 py-3 text-right font-semibold text-text-strong">
                    {fmtGBP(p.cost)}
                  </td>
                  <td
                    className={`num px-3 py-3 text-right font-semibold border-l border-hairline ${dirClass(p.unrealisedGL)}`}
                  >
                    {fmtGBPSigned(p.unrealisedGL)}
                  </td>
                  <td
                    className={`num px-3 py-3 text-right font-semibold ${dirClass(p.unrealisedPct)}`}
                  >
                    {fmtPct(p.unrealisedPct)}
                  </td>
                  <td className="px-2 pr-4 py-3" />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <SummaryTradeDialog
        target={tradeTarget}
        onClose={() => setTradeTarget(null)}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["portfolio"] })}
      />
      <SummaryDeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSellInstead={() => deleteTarget && setTradeTarget({ ...deleteTarget, mode: "sell" })}
        onDeleted={() => queryClient.invalidateQueries({ queryKey: ["portfolio"] })}
      />
    </AppShell>
  );
}

function SummaryTradeDialog({
  target,
  onClose,
  onSuccess,
}: {
  target: {
    ticker: string;
    name: string;
    units: number;
    lastPrice: number;
    mode: "buy" | "sell";
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [tradeUnits, setTradeUnits] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (target) {
      setMode(target.mode);
      setPrice(target.lastPrice.toFixed(1));
      setTradeUnits("");
      setDate(new Date().toISOString().split("T")[0]);
      setError("");
    }
  }, [target?.ticker, target?.mode]);

  const handleSubmit = async () => {
    const u = parseFloat(tradeUnits);
    if (!u || u <= 0) {
      setError("Enter a valid number of units.");
      return;
    }
    if (mode === "sell" && target && u > target.units) {
      setError(`Cannot sell more than ${target.units} units.`);
      return;
    }
    const p = parseFloat(price);
    if (!p || p <= 0) {
      setError("Enter a valid price in pence.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      if (mode === "buy") {
        await addLot({
          data: { ticker: target!.ticker, units: u, price: p, date },
        });
      } else {
        await sellUnits({ data: { ticker: target!.ticker, units: u, price: p } });
      }
      onSuccess();
      onClose();
    } catch {
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm border-hairline bg-[var(--surface)] text-text-strong">
        <DialogHeader>
          <DialogTitle className="font-mono">
            {target?.ticker}
            <span className="ml-2 text-sm font-normal text-text-muted">{target?.name}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-1 rounded-lg border border-hairline bg-canvas p-1">
          {(["buy", "sell"] as const).map((m) => (
            <button
              key={m}
              type="button"
              className={`flex-1 cursor-pointer rounded-md py-1.5 text-sm font-semibold transition-all ${mode === m ? (m === "buy" ? "bg-[#0ecb81] text-[#0b0e11]" : "bg-[#f6465d] text-white") : "text-text-muted hover:text-text-strong"}`}
              onClick={() => {
                setMode(m);
                setError("");
              }}
            >
              {m === "buy" ? "Buy" : "Sell"}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">Units</label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="any"
                value={tradeUnits}
                onChange={(e) => setTradeUnits(e.target.value)}
                placeholder="0"
                className="border-hairline bg-canvas text-text-strong placeholder:text-text-muted"
              />
              {mode === "sell" && target && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-hairline text-xs text-text-muted"
                  onClick={() => setTradeUnits(String(target.units))}
                >
                  Max
                </Button>
              )}
            </div>
            {mode === "sell" && target && (
              <p className="mt-1 text-xs text-text-muted">Available: {target.units} units</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-text-muted">
              {mode === "buy" ? "Buy price (pence)" : "Sell price (pence)"}
            </label>
            <Input
              type="number"
              min="0"
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="border-hairline bg-canvas text-text-strong"
            />
          </div>
          {mode === "buy" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-text-muted">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="border-hairline bg-canvas text-text-strong"
              />
            </div>
          )}
          {error && <p className="text-xs text-[#f6465d]">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" className="text-text-muted" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className={
              mode === "buy"
                ? "bg-[#0ecb81] text-[#0b0e11] hover:bg-[#0ecb81]/90"
                : "bg-[#f6465d] text-white hover:bg-[#f6465d]/90"
            }
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (mode === "buy" ? "Buying…" : "Selling…") : mode === "buy" ? "Buy" : "Sell"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SummaryDeleteDialog({
  target,
  onClose,
  onSellInstead,
  onDeleted,
}: {
  target: { ticker: string; name: string } | null;
  onClose: () => void;
  onSellInstead: () => void;
  onDeleted: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const handleDelete = async () => {
    if (!target) return;
    setLoading(true);
    try {
      await deleteHolding({ data: { ticker: target.ticker } });
      onDeleted();
      onClose();
    } finally {
      setLoading(false);
    }
  };
  return (
    <AlertDialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent className="border-hairline bg-[var(--surface)] text-text-strong">
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {target?.ticker}?</AlertDialogTitle>
          <AlertDialogDescription className="text-text-muted">
            This will permanently delete{" "}
            <span className="font-semibold text-text-strong">{target?.name}</span> and all its lots.
            Did you mean to <span className="font-semibold text-text-strong">sell</span> instead?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-wrap gap-2 sm:flex-nowrap">
          <AlertDialogCancel
            onClick={onClose}
            className="border-hairline bg-transparent text-text-muted hover:bg-canvas hover:text-text-strong sm:mt-0"
          >
            Cancel
          </AlertDialogCancel>
          <Button
            variant="outline"
            className="border-[#0ecb81]/40 text-[#0ecb81] hover:bg-[#0ecb81]/10"
            onClick={() => {
              onSellInstead();
              onClose();
            }}
          >
            Sell Instead
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting…" : "Delete"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function AddHoldingDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [priceLocked, setPriceLocked] = useState(false);
  const [form, setForm] = useState({ ticker: "", dateBought: "", price: "", units: "" });
  const [tickerSearch, setTickerSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedTicker, setDebouncedTicker] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!tickerSearch) {
      setDebouncedSearch("");
      return;
    }
    const t = setTimeout(() => setDebouncedSearch(tickerSearch), 280);
    return () => clearTimeout(t);
  }, [tickerSearch]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedTicker(form.ticker.trim().toUpperCase()), 600);
    return () => clearTimeout(t);
  }, [form.ticker]);

  const { data: suggestions = [] } = useQuery({
    queryKey: ["ticker-search", debouncedSearch],
    queryFn: () => searchTicker({ data: { query: debouncedSearch } }),
    enabled: debouncedSearch.length >= 1,
    staleTime: 30_000,
  });

  const { data: autoPrice, isFetching: priceFetching } = useQuery({
    queryKey: ["price-for-date", debouncedTicker, form.dateBought],
    queryFn: () => getPriceForDate({ data: { ticker: debouncedTicker, date: form.dateBought } }),
    enabled: debouncedTicker.length >= 1 && !!form.dateBought && !priceLocked,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!priceLocked && autoPrice?.price && autoPrice.price > 0) {
      setForm((f) => ({ ...f, price: autoPrice.price.toFixed(2) }));
    }
  }, [autoPrice, priceLocked]);

  type AddData = {
    ticker: string;
    units: number;
    dateBought: string;
    price?: number;
    bucket: "Fund" | "Stock";
    allocTarget: number;
  };
  const { mutateAsync, isPending } = useMutation({
    mutationFn: (data: AddData) => addHolding({ data: { ...data, deductCash: true } }),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: ["portfolio"] });
      const prev = queryClient.getQueryData<{
        holdings: Holding[];
        cashGBP: number;
        realisedGL: number;
      }>(["portfolio"]);
      const optimistic: Holding = {
        ticker: vars.ticker,
        name: vars.ticker,
        bucket: vars.bucket,
        sector: "",
        units: vars.units,
        avgBuyP: vars.price ?? 0,
        currency: "GBp",
        lastPrice: vars.price ?? 0,
        prevClose: 0,
        dayLow: 0,
        dayHigh: 0,
        yearLow: 0,
        yearHigh: 0,
        volume: 0,
        avgVol3m: 0,
        marketTime: "",
        targetP: 0,
        allocTarget: vars.allocTarget,
        holdPeriodDays: 0,
        spark: [],
      };
      queryClient.setQueryData(["portfolio"], (old: typeof prev) => ({
        ...old,
        holdings: [...(old?.holdings ?? []), optimistic],
      }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["portfolio"], ctx.prev);
      toast.error("Failed to add holding");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success("Holding added");
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await mutateAsync({
        ticker: form.ticker,
        units: parseFloat(form.units),
        dateBought: form.dateBought,
        ...(priceLocked && form.price ? { price: parseFloat(form.price) } : {}),
        bucket: form.ticker.startsWith("0P") ? "Fund" : "Stock",
        allocTarget: 0,
      });
      setOpen(false);
      setForm({ ticker: "", dateBought: "", price: "", units: "" });
      setPriceLocked(false);
      setTickerSearch("");
      setDebouncedSearch("");
      setDebouncedTicker("");
      setShowSuggestions(false);
    } catch {
      setError("Failed to add holding. Please try again.");
    }
  }

  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-text-muted">
      {children}
    </label>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setTickerSearch("");
          setDebouncedSearch("");
          setDebouncedTicker("");
          setShowSuggestions(false);
          setPriceLocked(false);
          setError("");
        }
      }}
    >
      <DialogTrigger asChild>
        <button className="flex items-center gap-1.5 rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-[#181a20] transition-colors hover:bg-[var(--primary-active)]">
          <Plus className="size-3.5" />
          Add holding
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm border-hairline bg-[var(--surface)] text-text-strong">
        <DialogHeader>
          <DialogTitle>Add holding</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="relative col-span-2">
                <FieldLabel>Ticker</FieldLabel>
                <Input
                  required
                  placeholder="e.g. AAPL or search…"
                  value={form.ticker}
                  onChange={(e) => {
                    const v = e.target.value.toUpperCase();
                    setForm({ ...form, ticker: v });
                    setTickerSearch(v);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className="border-hairline bg-canvas text-text-strong"
                  autoComplete="off"
                />
                {showSuggestions && suggestions.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-auto rounded-lg border border-hairline bg-[var(--surface-elevated)] py-1 shadow-lg">
                    {suggestions.slice(0, 8).map((s) => (
                      <li
                        key={s.ticker}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setForm({ ...form, ticker: s.ticker });
                          setTickerSearch("");
                          setDebouncedSearch("");
                          setShowSuggestions(false);
                        }}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-[var(--surface)]"
                      >
                        <span className="num w-24 shrink-0 text-xs font-semibold text-[var(--primary)]">
                          {s.ticker}
                        </span>
                        <span className="truncate text-xs text-text-muted">{s.name}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <FieldLabel>Units</FieldLabel>
                <Input
                  required
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={form.units}
                  onChange={(e) => setForm({ ...form, units: e.target.value })}
                  className="border-hairline bg-canvas text-text-strong"
                />
              </div>
            </div>

            <div>
              <FieldLabel>Date Bought</FieldLabel>
              <Input
                required
                type="date"
                value={form.dateBought}
                onChange={(e) => setForm({ ...form, dateBought: e.target.value })}
                className="border-hairline bg-canvas text-text-strong"
              />
            </div>

            <div>
              <FieldLabel>Price at Purchase</FieldLabel>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="any"
                  placeholder={priceLocked ? "Enter price (pence)" : "Auto-detect"}
                  value={form.price}
                  onChange={(e) => {
                    setForm({ ...form, price: e.target.value });
                    setPriceLocked(true);
                  }}
                  className={`border bg-canvas pr-9 text-text-strong transition-colors ${
                    priceFetching && !priceLocked
                      ? "border-[var(--primary)]/60"
                      : !priceLocked && autoPrice?.price && autoPrice.price > 0
                        ? "border-[#0ecb81]/60"
                        : "border-hairline"
                  }`}
                />
                <button
                  type="button"
                  title={priceLocked ? "Restore auto-detect" : "Enter price manually"}
                  onClick={() => setPriceLocked((l) => !l)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted transition-colors hover:text-text-strong"
                >
                  {priceFetching && !priceLocked ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--primary)]" />
                  ) : priceLocked ? (
                    <Unlock className="h-4 w-4 text-[#f0b90b]" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-text-muted">
                {priceFetching && !priceLocked
                  ? "Fetching price from Yahoo Finance…"
                  : priceLocked
                    ? "Manual — click the unlock icon to restore auto-detect."
                    : !priceLocked && autoPrice?.price && autoPrice.price > 0
                      ? "✓ Price fetched from Yahoo Finance."
                      : "Price will be fetched automatically from Yahoo Finance."}
              </p>
            </div>

            {error && <p className="text-xs text-[#f6465d]">{error}</p>}
          </div>
          <DialogFooter className="mt-4">
            <Button
              variant="ghost"
              className="text-text-muted"
              type="button"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="!bg-[#F0B90B] !text-gray-600 font-semibold shadow-sm hover:!bg-[#d4a00b] hover:shadow-md active:scale-[0.98]"
            >
              {isPending ? "Adding…" : "Add holding"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

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
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-text-strong">{title}</h3>
        {subtitle && <p className="text-[11px] text-text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
