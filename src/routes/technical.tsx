import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, useRef } from "react";
import { z } from "zod";
import { Search } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { TechnicalChart } from "@/components/TechnicalChart";
import { getPortfolio } from "@/fns/holdings";

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

function TechnicalPage() {
  const { data: portfolio } = useQuery({
    queryKey: ["portfolio"],
    queryFn: () => getPortfolio(),
  });

  const stocks = useMemo(
    () => (portfolio?.holdings ?? []).filter((h) => h.bucket === "Stock"),
    [portfolio],
  );

  const { ticker: urlTicker } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const initial = urlTicker ?? stocks[0]?.ticker ?? "";
  const [currentTicker, setCurrentTicker] = useState(initial);
  const [inputValue, setInputValue] = useState(initial);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!inputValue) return stocks.slice(0, 8);
    const q = inputValue.toUpperCase();
    return stocks
      .filter(
        (h) => h.ticker.includes(q) || h.name.toLowerCase().includes(inputValue.toLowerCase()),
      )
      .slice(0, 8);
  }, [stocks, inputValue]);

  const holding = useMemo(
    () => stocks.find((h) => h.ticker === currentTicker),
    [stocks, currentTicker],
  );

  function submitTicker(t: string) {
    const upper = t.trim().toUpperCase();
    if (!upper) return;
    setCurrentTicker(upper);
    setInputValue(upper);
    setShowSuggestions(false);
    void navigate({ search: { ticker: upper } });
  }

  return (
    <AppShell>
      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        <p className="eyebrow text-text-muted">Charts</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-0.02em] text-text-strong">
          Technical Analysis
        </h1>
      </div>

      {/* ── Ticker search ─────────────────────────────────────────────────── */}
      <div className="mb-4">
        <div className="relative w-80">
          <div className="flex items-center overflow-hidden rounded-sm border border-hairline bg-[var(--surface-elevated)] focus-within:ring-1 focus-within:ring-[var(--brand-periwinkle)]/40">
            <Search className="ml-3 size-3.5 shrink-0 text-text-muted" />
            <input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value.toUpperCase());
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitTicker(inputValue);
                if (e.key === "Escape") {
                  setShowSuggestions(false);
                  inputRef.current?.blur();
                }
              }}
              placeholder="Search holdings or enter any ticker…"
              className="num w-full bg-transparent px-2.5 py-2 text-sm text-text-strong placeholder:text-text-muted focus:outline-none"
              spellCheck={false}
              autoCapitalize="characters"
            />
          </div>

          {showSuggestions && (suggestions.length > 0 || inputValue) && (
            <div className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-sm border border-hairline bg-[var(--surface-elevated)] shadow-md">
              {suggestions.map((h) => (
                <button
                  key={h.ticker}
                  onMouseDown={() => submitTicker(h.ticker)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-canvas/60"
                >
                  <span className="num w-14 text-xs font-semibold text-text-strong">
                    {h.ticker}
                  </span>
                  <span className="truncate text-xs text-text-muted">{h.name}</span>
                </button>
              ))}
              {inputValue.length >= 1 && !stocks.some((h) => h.ticker === inputValue) && (
                <button
                  onMouseDown={() => submitTicker(inputValue)}
                  className="flex w-full items-center gap-2 border-t border-hairline px-3 py-2 text-left transition-colors hover:bg-canvas/60"
                >
                  <span className="num w-14 text-xs font-semibold text-[var(--primary)]">
                    {inputValue}
                  </span>
                  <span className="text-xs text-text-muted">Search this ticker →</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Holdings chips — always visible, click to switch ticker */}
        {stocks.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {stocks.slice(0, 12).map((h) => (
              <button
                key={h.ticker}
                onClick={() => submitTicker(h.ticker)}
                className={`num rounded px-2 py-0.5 text-[11px] font-medium transition-colors ${
                  h.ticker === currentTicker
                    ? "bg-[var(--primary)]/10 text-[var(--primary)] ring-1 ring-[var(--primary)]/30"
                    : "border border-hairline text-text-muted hover:border-[var(--primary)]/40 hover:text-text-body"
                }`}
              >
                {h.ticker}
              </button>
            ))}
          </div>
        )}

        {/* Price strip — only for portfolio stocks */}
        {holding && (
          <div className="mt-3 flex items-baseline gap-3 pl-0.5">
            <span className="text-sm text-text-muted">{holding.name}</span>
            {holding.lastPrice != null && (
              <span className="num text-xl font-semibold text-text-strong">
                {holding.currency === "GBP"
                  ? "£"
                  : holding.currency === "GBp"
                    ? ""
                    : `${holding.currency} `}
                {holding.lastPrice.toFixed(holding.currency === "GBP" ? 2 : 0)}
              </span>
            )}
            {holding.prevClose != null && holding.lastPrice != null && (
              <span
                className={`num text-sm font-medium ${
                  holding.lastPrice >= holding.prevClose ? "text-[var(--up)]" : "text-[var(--down)]"
                }`}
              >
                {holding.lastPrice >= holding.prevClose ? "+" : ""}
                {(((holding.lastPrice - holding.prevClose) / holding.prevClose) * 100).toFixed(2)}%
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Chart ─────────────────────────────────────────────────────────── */}
      {currentTicker ? (
        <TechnicalChart
          ticker={currentTicker}
          currency={holding?.currency}
          avgBuyP={holding?.avgBuyP}
        />
      ) : (
        <div className="flex h-96 items-center justify-center rounded-sm border border-hairline text-sm text-text-muted">
          Search for a ticker above to load a chart.
        </div>
      )}
    </AppShell>
  );
}
