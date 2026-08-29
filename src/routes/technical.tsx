import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { TechnicalChart, type TechnicalChartIndicators } from "@/components/TechnicalChart";
import { getPortfolio } from "@/fns/holdings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const searchSchema = z.object({ ticker: z.string().optional() });

export const Route = createFileRoute("/technical")({
  loader: ({ context: { queryClient } }) =>
    queryClient.ensureQueryData({
      queryKey: ["portfolio"],
      queryFn: () => getPortfolio(),
    }),
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Technical Analysis — StockTracker" },
      {
        name: "description",
        content: "Candlestick charts with moving averages, Bollinger Bands, RSI, and MACD.",
      },
    ],
  }),
  component: TechnicalPage,
});

type IndicatorKey = keyof TechnicalChartIndicators;

const INDICATOR_LABELS: Record<IndicatorKey, string> = {
  volume: "Volume",
  ma: "MA",
  bollinger: "Bollinger",
  rsi: "RSI",
  macd: "MACD",
};

function TechnicalPage() {
  const { data: portfolio } = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => getPortfolio(),
  });

  const holdings = useMemo(() => portfolio?.holdings ?? [], [portfolio]);
  const { ticker } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [currentTicker, setCurrentTicker] = useState<string>(ticker ?? holdings[0]?.ticker ?? "");

  const [indicators, setIndicators] = useState<TechnicalChartIndicators>({
    volume: true,
    ma: false,
    bollinger: false,
    rsi: false,
    macd: false,
  });

  const holding = useMemo(
    () => holdings.find((h) => h.ticker === currentTicker) ?? holdings[0],
    [holdings, currentTicker],
  );

  function handleTickerChange(t: string) {
    setCurrentTicker(t);
    void navigate({ search: { ticker: t } });
  }

  function toggleIndicator(key: IndicatorKey) {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!holding) {
    return (
      <AppShell>
        <div className="mb-8">
          <p className="eyebrow text-text-muted">Charts</p>
          <h1 className="mt-2 text-4xl font-medium tracking-[-0.02em] text-text-strong">
            Technical Analysis
          </h1>
          <p className="mt-2 max-w-xl text-[15px] text-text-muted">
            No holdings to display. Add holdings to get started.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-text-muted">Charts</p>
          <h1 className="mt-2 text-4xl font-medium tracking-[-0.02em] text-text-strong">
            Technical Analysis
          </h1>
        </div>

        {/* Holdings dropdown */}
        <Select value={currentTicker} onValueChange={handleTickerChange}>
          <SelectTrigger className="num w-72 border border-hairline bg-[var(--surface-elevated)] text-sm font-medium text-text-strong focus:ring-[var(--brand-periwinkle)]/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-hairline bg-[var(--surface-elevated)] text-text-strong">
            {holdings.map((h) => (
              <SelectItem key={h.ticker} value={h.ticker}>
                <span className="num mr-2 text-text-muted">{h.ticker}</span>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Holding summary strip ────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 border-b border-hairline pb-4">
        <span className="text-2xl font-semibold tracking-tight text-text-strong num">
          {holding.lastPrice != null
            ? `${holding.currency === "GBp" ? "" : holding.currency === "GBP" ? "£" : holding.currency + " "}${holding.lastPrice.toFixed(holding.currency === "GBP" ? 2 : 0)}`
            : "—"}
        </span>
        {holding.prevClose != null && holding.lastPrice != null && (
          <>
            <span
              className={`num text-sm font-medium ${
                holding.lastPrice >= holding.prevClose ? "text-[var(--up)]" : "text-[var(--down)]"
              }`}
            >
              {holding.lastPrice >= holding.prevClose ? "+" : ""}
              {(holding.lastPrice - holding.prevClose).toFixed(holding.currency === "GBP" ? 2 : 0)}
            </span>
            <span
              className={`num text-sm font-medium ${
                holding.lastPrice >= holding.prevClose ? "text-[var(--up)]" : "text-[var(--down)]"
              }`}
            >
              {holding.lastPrice >= holding.prevClose ? "+" : ""}
              {(((holding.lastPrice - holding.prevClose) / holding.prevClose) * 100).toFixed(2)}%
            </span>
          </>
        )}
        <span className="eyebrow text-text-muted">{holding.currency}</span>
      </div>

      {/* ── Indicator toggles ────────────────────────────────────────────── */}
      <div className="mb-4 flex flex-wrap items-center gap-1">
        <span className="eyebrow mr-2 text-text-muted">Indicators</span>
        {(Object.keys(INDICATOR_LABELS) as IndicatorKey[]).map((key) => (
          <button
            key={key}
            onClick={() => toggleIndicator(key)}
            className={`num rounded-sm px-3 py-1 text-xs uppercase tracking-[0.04em] transition-colors ${
              indicators[key]
                ? "bg-[var(--primary)] text-[var(--on-primary)]"
                : "border border-hairline text-text-muted hover:text-text-body"
            }`}
          >
            {INDICATOR_LABELS[key]}
          </button>
        ))}
      </div>

      {/* ── Chart ────────────────────────────────────────────────────────── */}
      <div className="rounded-sm border border-hairline bg-[var(--surface-card)] p-4">
        <TechnicalChart
          ticker={holding.ticker}
          currency={holding.currency}
          avgBuyP={holding.avgBuyP}
          indicators={indicators}
        />
      </div>
    </AppShell>
  );
}
