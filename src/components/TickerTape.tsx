import { useQuery } from "@tanstack/react-query";
import { getPublicTicker } from "@/fns/public";
import type { TickerItem } from "@/fns/public";

function TickerCell({ item, onDark }: { item: TickerItem; onDark: boolean }) {
  const up = item.changePct >= 0;
  const pct = `${up ? "+" : ""}${item.changePct.toFixed(2)}%`;
  return (
    <span className="inline-flex shrink-0 items-center">
      <span
        className={`font-mono text-xs font-medium uppercase tracking-[0.04em] ${
          onDark ? "text-[var(--on-dark)]" : "text-[var(--text-strong)]"
        }`}
      >
        {item.ticker}
      </span>
      <span
        className={`ml-2 font-mono text-xs tabular-nums ${
          onDark ? "text-white/70" : "text-[var(--text-body)]"
        }`}
      >
        {item.last.toFixed(item.last < 10 ? 4 : 2)}
      </span>
      <span
        className={`ml-2 font-mono text-xs tabular-nums ${up ? "text-[var(--up)]" : "text-[var(--down)]"}`}
      >
        {pct}
      </span>
      <span
        className={`mx-4 ${onDark ? "text-white/40" : "text-[var(--text-muted)] opacity-40"}`}
      >
        ·
      </span>
    </span>
  );
}

const FALLBACK: TickerItem[] = [
  { ticker: "AAPL", name: "Apple", last: 0, changePct: 0 },
  { ticker: "MSFT", name: "Microsoft", last: 0, changePct: 0 },
  { ticker: "NVDA", name: "NVIDIA", last: 0, changePct: 0 },
  { ticker: "^GSPC", name: "S&P 500", last: 0, changePct: 0 },
  { ticker: "^FTSE", name: "FTSE 100", last: 0, changePct: 0 },
];

export function TickerTape({ onDark = false }: { onDark?: boolean }) {
  const { data = FALLBACK } = useQuery({
    queryKey: ["public-ticker"],
    queryFn: () => getPublicTicker(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const items = data.length ? data : FALLBACK;

  return (
    <div
      className={`w-full overflow-hidden py-1.5 ${
        onDark ? "border-b border-white/10" : "border-b border-hairline"
      }`}
    >
      <div
        className="flex w-max"
        style={{ animation: "ticker-scroll 25s linear infinite", willChange: "transform" }}
      >
        {[...items, ...items, ...items].map((item, i) => (
          <TickerCell key={`${item.ticker}-${i}`} item={item} onDark={onDark} />
        ))}
      </div>
    </div>
  );
}
