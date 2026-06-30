import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Fragment, useMemo, useState, useEffect } from "react";
import { ArrowLeftRight, Loader2, Lock, Plus, Trash2, Unlock } from "lucide-react";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import {
  getPortfolio,
  addHolding,
  addLot,
  getPriceForDate,
  sellUnits,
  deleteHolding,
  searchTicker,
} from "@/fns/holdings";
import { compute, type Bucket, type Holding } from "@/data/portfolio";
import { dirClass, fmtGBP, fmtGBPSigned, fmtNum, fmtPct } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/holdings")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: ["portfolio"],
      queryFn: () => getPortfolio(),
    }),
  head: () => ({
    meta: [
      { title: "Holdings — StockTracker" },
      {
        name: "description",
        content: "P&L detail per holding with waterfall and gain-vs-hold scatter.",
      },
    ],
  }),
  component: HoldingsPage,
});

type TradeTarget = {
  ticker: string;
  name: string;
  units: number;
  lastPrice: number;
  mode: "buy" | "sell";
};

type DeleteTarget = {
  ticker: string;
  name: string;
  units: number;
  lastPrice: number;
};

function ScatterTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div
      style={{
        background: "#0f1923",
        border: "1px solid #38bdf8",
        borderRadius: 8,
        fontSize: 12,
        fontFamily: "JetBrains Mono",
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        padding: "8px 12px",
        lineHeight: 1.6,
      }}
    >
      <p style={{ color: "#38bdf8", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>{d.name}</p>
      <p style={{ color: "#929aa5", fontSize: 10, marginBottom: 6 }}>{d.sector}</p>
      <p style={{ color: "#e2e8f0" }}>
        Gain:{" "}
        <span style={{ color: d.y >= 0 ? "#0ecb81" : "#f6465d" }}>
          {d.y >= 0 ? "+" : ""}
          {d.y.toFixed(2)}%
        </span>
      </p>
      <p style={{ color: "#e2e8f0" }}>Held: {d.x}d</p>
      <p style={{ color: "#e2e8f0" }}>Value: {fmtGBP(d.z)}</p>
    </div>
  );
}

function HoldingsPage() {
  const { data: portfolio } = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => getPortfolio(),
  });
  const queryClient = useQueryClient();
  const [tradeTarget, setTradeTarget] = useState<TradeTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  const holdings = portfolio?.holdings ?? [];
  const cashGBP = portfolio?.cashGBP ?? 0;
  const p = useMemo(() => compute(holdings, cashGBP), [holdings, cashGBP]);

  const refreshPortfolio = () => queryClient.invalidateQueries({ queryKey: ["portfolio"] });

  const groups: { bucket: Bucket; rows: typeof p.rows }[] = (["Fund", "Stock"] as Bucket[]).map(
    (b) => ({ bucket: b, rows: p.rows.filter((r) => r.bucket === b) }),
  );

  const waterfall = useMemo(
    () =>
      [...p.rows]
        .sort((a, b) => b.unrealisedGL - a.unrealisedGL)
        .map((r) => ({ name: r.ticker.replace(".L", ""), gain: +r.unrealisedGL.toFixed(2) })),
    [p.rows],
  );
  const total = waterfall.reduce((s, r) => s + r.gain, 0);

  const scatter = useMemo(
    () =>
      p.rows.map((r) => ({
        ticker: r.ticker.replace(".L", ""),
        name: r.name,
        sector: r.bucket === "Fund" ? "Fund" : r.sector || "Other",
        x: r.holdPeriodDays,
        y: +r.unrealisedPct.toFixed(2),
        z: +r.marketValueGBP.toFixed(0),
      })),
    [p.rows],
  );

  return (
    <AppShell>
      <h1 className="mb-1 text-2xl font-semibold text-text-strong">Holdings</h1>
      <p className="mb-6 text-sm text-text-muted">
        Position-level P&amp;L. Subtotals per bucket, grand total at bottom.
      </p>

      <section className="rounded-xl border border-hairline bg-surface">
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-6 py-4">
          <span className="text-sm font-semibold text-text-strong">
            {p.rows.length} position{p.rows.length !== 1 ? "s" : ""}
          </span>
          <AddHoldingDialog onSuccess={refreshPortfolio} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-text-muted border-b border-hairline">
                <th
                  className="text-left pl-6 py-3 font-semibold text-[#fcd535]"
                  style={{ borderLeft: "3px solid #fcd535" }}
                  rowSpan={2}
                >
                  Positions
                </th>
                <th className="whitespace-nowrap text-right px-3 py-3 font-semibold" rowSpan={2}>
                  Units
                </th>
                <th className="whitespace-nowrap text-right px-3 py-3 font-semibold" rowSpan={2}>
                  Avg buy (p)
                </th>
                <th className="whitespace-nowrap text-right px-3 py-3 font-semibold" rowSpan={2}>
                  Cost (£)
                </th>
                <th className="whitespace-nowrap text-right px-3 py-3 font-semibold" rowSpan={2}>
                  Price (p)
                </th>
                <th className="whitespace-nowrap text-right px-3 py-3 font-semibold" rowSpan={2}>
                  Value (£)
                </th>
                <th
                  className="text-center px-3 py-2 font-semibold border-l border-hairline"
                  colSpan={2}
                >
                  Gain / loss
                </th>
                <th className="whitespace-nowrap text-right px-3 py-3 font-semibold" rowSpan={2}>
                  <span className="inline-flex items-center justify-end gap-1">
                    Target (p)
                    <span
                      title="Analyst consensus mean price target from Yahoo Finance. Only populated for individual stocks with active broker coverage — funds and ETFs will show 0."
                      className="inline-flex cursor-help items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[9px] text-text-muted w-3.5 h-3.5 leading-none border border-hairline hover:text-text-body transition-colors"
                    >
                      ?
                    </span>
                  </span>
                </th>
                <th className="whitespace-nowrap text-right px-3 py-3 font-semibold" rowSpan={2}>
                  <span className="inline-flex items-center justify-end gap-1">
                    Upside
                    <span
                      title="How far the current price sits below the analyst target: (target − price) ÷ price. Only meaningful for individual stocks with analyst coverage."
                      className="inline-flex cursor-help items-center justify-center rounded-full bg-[var(--surface-elevated)] text-[9px] text-text-muted w-3.5 h-3.5 leading-none border border-hairline hover:text-text-body transition-colors"
                    >
                      ?
                    </span>
                  </span>
                </th>
                <th className="whitespace-nowrap text-right px-3 py-3 font-semibold" rowSpan={2}>
                  Hold
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
              {p.rows.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-6 py-10 text-center text-sm text-text-muted">
                    No holdings yet.
                  </td>
                </tr>
              )}
              {groups.map((g) => {
                if (g.rows.length === 0) return null;
                const subCost = g.rows.reduce((s, r) => s + r.costGBP, 0);
                const subVal = g.rows.reduce((s, r) => s + r.marketValueGBP, 0);
                const subGain = subVal - subCost;
                const bucketColor = g.bucket === "Fund" ? "#38bdf8" : "#818cf8";
                return (
                  <Fragment key={g.bucket}>
                    <tr
                      style={{ borderLeft: `3px solid ${bucketColor}` }}
                      className={
                        g.bucket === "Fund" ? "bg-[#38bdf8]/[0.08]" : "bg-[#818cf8]/[0.08]"
                      }
                    >
                      <td
                        colSpan={12}
                        className={`px-6 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] ${g.bucket === "Fund" ? "text-[#38bdf8]" : "text-[#818cf8]"}`}
                      >
                        {g.bucket === "Stock" ? "Stocks" : g.bucket}
                      </td>
                    </tr>
                    {g.rows.map((r) => (
                      <tr
                        key={r.ticker}
                        className="border-t border-hairline hover:bg-[var(--surface-elevated)]/40"
                      >
                        <td className="pl-6 pr-3 py-3 max-w-[220px]">
                          <div className="truncate font-semibold leading-tight text-text-strong">
                            {r.name}
                          </div>
                          <div className="font-mono text-[11px] text-text-muted">{r.ticker}</div>
                        </td>
                        <td className="num whitespace-nowrap px-3 py-3 text-right text-text-body">
                          {fmtNum(r.units, 2)}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-3 text-right text-text-body">
                          {fmtNum(r.avgBuyP, 1)}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-3 text-right text-text-body">
                          {fmtGBP(r.costGBP)}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-3 text-right text-text-body">
                          {fmtNum(r.lastPrice, 1)}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-3 text-right font-medium text-text-strong">
                          {fmtGBP(r.marketValueGBP)}
                        </td>
                        <td
                          className={`num whitespace-nowrap px-3 py-3 text-right border-l border-hairline ${dirClass(r.unrealisedGL)}`}
                        >
                          {fmtGBPSigned(r.unrealisedGL)}
                        </td>
                        <td
                          className={`num whitespace-nowrap px-3 py-3 text-right ${dirClass(r.unrealisedPct)}`}
                        >
                          {fmtPct(r.unrealisedPct)}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-3 text-right text-text-body">
                          {fmtNum(r.targetP, 0)}
                        </td>
                        <td
                          className={`num whitespace-nowrap px-3 py-3 text-right ${dirClass(r.upsidePct)}`}
                        >
                          {fmtPct(r.upsidePct, 1)}
                        </td>
                        <td className="num whitespace-nowrap px-3 py-3 text-right text-text-muted">
                          {r.holdPeriodDays}d
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
                              title="Delete holding"
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
                    ))}
                    <tr
                      style={{ borderLeft: `3px solid ${bucketColor}` }}
                      className={`border-t border-hairline text-text-muted-strong ${g.bucket === "Fund" ? "bg-[#38bdf8]/[0.05]" : "bg-[#818cf8]/[0.05]"}`}
                    >
                      <td
                        className={`pl-6 pr-3 py-3 text-[11px] font-semibold uppercase tracking-wider ${g.bucket === "Fund" ? "text-[#38bdf8]" : "text-[#818cf8]"}`}
                      >
                        Subtotal
                      </td>
                      <td className="px-3 py-3" colSpan={2} />
                      <td className="num whitespace-nowrap px-3 py-3 text-right">
                        {fmtGBP(subCost)}
                      </td>
                      <td className="px-3 py-3" />
                      <td className="num whitespace-nowrap px-3 py-3 text-right text-text-strong">
                        {fmtGBP(subVal)}
                      </td>
                      <td
                        className={`num whitespace-nowrap px-3 py-3 text-right border-l border-hairline ${dirClass(subGain)}`}
                      >
                        {fmtGBPSigned(subGain)}
                      </td>
                      <td
                        className={`num whitespace-nowrap px-3 py-3 text-right ${dirClass(subGain)}`}
                      >
                        {fmtPct((subGain / subCost) * 100)}
                      </td>
                      <td className="px-3 py-3" colSpan={4} />
                    </tr>
                  </Fragment>
                );
              })}
              {p.rows.length > 0 && (
                <tr className="border-t-2 border-[#fcd535]/40 bg-[#fcd535]/[0.07]">
                  <td className="pl-6 pr-3 py-3 text-xs font-bold uppercase tracking-wider text-[#fcd535]">
                    Total
                  </td>
                  <td className="px-3 py-3" colSpan={2} />
                  <td className="num whitespace-nowrap px-3 py-3 text-right font-semibold">
                    {fmtGBP(p.cost)}
                  </td>
                  <td className="px-3 py-3" />
                  <td className="num whitespace-nowrap px-3 py-3 text-right font-semibold text-text-strong">
                    {fmtGBP(p.marketValue)}
                  </td>
                  <td
                    className={`num whitespace-nowrap px-3 py-3 text-right font-semibold border-l border-hairline ${dirClass(p.unrealisedGL)}`}
                  >
                    {fmtGBPSigned(p.unrealisedGL)}
                  </td>
                  <td
                    className={`num whitespace-nowrap px-3 py-3 text-right font-semibold ${dirClass(p.unrealisedPct)}`}
                  >
                    {fmtPct(p.unrealisedPct)}
                  </td>
                  <td className="px-3 py-3" colSpan={4} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-hairline bg-surface p-5">
          <h3 className="text-sm font-semibold text-text-strong">
            Contribution to unrealised gain
          </h3>
          <p className="text-[11px] text-text-muted">
            Each holding&apos;s £ contribution, sorted by impact.
          </p>
          <div className="mt-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[...waterfall, { name: "TOTAL", gain: +total.toFixed(2) }]}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#929aa5", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  axisLine={{ stroke: "#2b3139" }}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => `£${(v / 1000).toFixed(1)}k`}
                  tick={{ fill: "#707a8a", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
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
                  formatter={(v: number) => [fmtGBPSigned(v), "Gain"]}
                  cursor={{ fill: "rgba(255,255,255,0.03)" }}
                />
                <ReferenceLine y={0} stroke="#2b3139" />
                <Bar dataKey="gain">
                  {[...waterfall, { name: "TOTAL", gain: total }].map((d) => (
                    <Cell
                      key={d.name}
                      fill={d.name === "TOTAL" ? "#fcd535" : d.gain >= 0 ? "#0ecb81" : "#f6465d"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-hairline bg-surface p-5">
          <h3 className="text-sm font-semibold text-text-strong">Gain % vs hold period</h3>
          <p className="text-[11px] text-text-muted">
            Dot size = position value. Do longer holds compound better?
          </p>
          <div className="mt-4 h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
                <XAxis
                  dataKey="x"
                  type="number"
                  name="Days"
                  tickFormatter={(v) => `${v}d`}
                  tick={{ fill: "#707a8a", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  axisLine={{ stroke: "#2b3139" }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="y"
                  type="number"
                  name="Gain %"
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: "#707a8a", fontSize: 11, fontFamily: "JetBrains Mono" }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <ZAxis dataKey="z" range={[80, 600]} />
                <ReferenceLine y={0} stroke="#2b3139" />
                <Tooltip
                  content={ScatterTooltip}
                  cursor={{ strokeDasharray: "3 3", stroke: "#38bdf8" }}
                />
                <Scatter data={scatter}>
                  {scatter.map((s) => (
                    <Cell key={s.ticker} fill={s.y >= 0 ? "#0ecb81" : "#f6465d"} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <TradeDialog
        target={tradeTarget}
        onClose={() => setTradeTarget(null)}
        onSuccess={refreshPortfolio}
      />
      <DeleteConfirmDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onSellInstead={() => {
          if (deleteTarget) {
            setTradeTarget({ ...deleteTarget, mode: "sell" });
          }
        }}
        onDeleted={refreshPortfolio}
      />
    </AppShell>
  );
}

function AddHoldingDialog({ onSuccess }: { onSuccess: () => void }) {
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
      onSuccess();
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

function TradeDialog({
  target,
  onClose,
  onSuccess,
}: {
  target: TradeTarget | null;
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
      setError("Please enter a valid number of units.");
      return;
    }
    if (mode === "sell" && target && u > target.units) {
      setError(`Cannot sell more than ${fmtNum(target.units, 2)} units.`);
      return;
    }

    const p = parseFloat(price);
    if (!p || p <= 0) {
      setError("Please enter a valid price in pence.");
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
      setError("Something went wrong. Please try again.");
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
              className={`flex-1 cursor-pointer rounded-md py-1.5 text-sm font-semibold transition-all ${
                mode === m
                  ? m === "buy"
                    ? "bg-[#0ecb81] text-[#0b0e11]"
                    : "bg-[#f6465d] text-white"
                  : "text-text-muted hover:text-text-strong"
              }`}
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
                  className="shrink-0 border-hairline text-xs text-text-muted hover:text-text-strong"
                  onClick={() => setTradeUnits(String(target.units))}
                >
                  Max
                </Button>
              )}
            </div>
            {mode === "sell" && target && (
              <p className="mt-1 text-xs text-text-muted">
                Available: {fmtNum(target.units, 2)} units
              </p>
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

          {mode === "sell" && target && parseFloat(tradeUnits) >= target.units && (
            <p className="text-xs text-[#f6465d]">— will close position</p>
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

function DeleteConfirmDialog({
  target,
  onClose,
  onSellInstead,
  onDeleted,
}: {
  target: DeleteTarget | null;
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
          <AlertDialogDescription className="leading-relaxed text-text-muted">
            This will permanently delete{" "}
            <span className="font-semibold text-text-strong">{target?.name}</span> and all its lots
            from your portfolio.
            <br />
            <br />
            Did you mean to <span className="font-semibold text-text-strong">sell</span> your
            position instead?
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
            className="border-[#0ecb81]/40 text-[#0ecb81] hover:bg-[#0ecb81]/10 hover:text-[#0ecb81]"
            onClick={() => {
              onSellInstead();
              onClose();
            }}
          >
            Sell Instead
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={loading}>
            {loading ? "Deleting…" : "Delete Anyway"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
